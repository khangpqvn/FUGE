using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using FuGrade;
using FuGrade.LegacyBridge.Serialization;
using FuGrade.LegacyBridge.Validation;
using FuGradeLib;
using Newtonsoft.Json;

namespace FuGrade.LegacyBridge
{
    internal static class Program
    {
        private const int MaxBytes = 8 * 1024 * 1024;

        private static void Main()
        {
            using (var listener = new HttpListener())
            {
                listener.Prefixes.Add("http://127.0.0.1:5099/");
                listener.Start();
                while (true)
                {
                    var context = listener.GetContext();
                    try { Handle(context); }
                    catch (Exception) { WriteError(context.Response, 400, "Legacy conversion failed."); }
                    finally { context.Response.Close(); }
                }
            }
        }

        private static void Handle(HttpListenerContext context)
        {
            if (context.Request.HttpMethod != "POST") { WriteError(context.Response, 405, "POST required."); return; }
            var kind = GetQuery(context.Request.Url, "kind");
            if (context.Request.Url.AbsolutePath.Equals("/api/legacy/import", StringComparison.OrdinalIgnoreCase))
            {
                var bytes = ReadMultipartFile(context.Request, MaxBytes);
                var root = LegacySerializer.Deserialize(bytes);
                var document = ImportDocument(root, kind);
                WriteJson(context.Response, document);
                return;
            }
            if (context.Request.Url.AbsolutePath.Equals("/api/legacy/export", StringComparison.OrdinalIgnoreCase))
            {
                var body = ReadBody(context.Request.InputStream, MaxBytes);
                var envelope = JsonConvert.DeserializeObject<CanonicalEnvelope>(Encoding.UTF8.GetString(body));
                if (envelope == null || envelope.data == null || envelope.kind != kind) throw new ArgumentException("Document kind mismatch.");
                var root = ExportDocument(envelope, kind);
                var bytes = LegacySerializer.Serialize(root);
                context.Response.ContentType = "application/octet-stream";
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                return;
            }
            WriteError(context.Response, 404, "Route not found.");
        }

        private static object ImportDocument(object root, string kind)
        {
            if (kind == "thesis-comment" && root is ThesisComment comment)
            {
                CanonicalValidator.ValidateThesisComment(comment);
                return Envelope(kind, comment, "cmt");
            }
            if (kind == "defense-grading" && root is DefenseGrading defense)
            {
                CanonicalValidator.ValidateDefense(defense);
                return Envelope(kind, defense, "tef");
            }
            if (kind == "final-thesis-grading-items" && root is List<FinalThesisGradingItem> items)
                return Envelope(kind, new { items }, "master");
            throw new ArgumentException("Legacy root does not match requested kind.");
        }

        private static object ExportDocument(CanonicalEnvelope envelope, string kind)
        {
            if (kind == "thesis-comment")
            {
                var value = envelope.data.ToObject<ThesisComment>();
                CanonicalValidator.ValidateThesisComment(value);
                return value;
            }
            if (kind == "defense-grading")
            {
                var value = envelope.data.ToObject<DefenseGrading>();
                CanonicalValidator.ValidateDefense(value);
                return value;
            }
            if (kind == "final-thesis-grading-items")
            {
                var value = envelope.data.ToObject<CriteriaPayload>();
                return value.items ?? new List<FinalThesisGradingItem>();
            }
            throw new ArgumentException("Unsupported document kind.");
        }

        private static object Envelope(string kind, object data, string source)
        {
            return new { format = "fugrade.canonical", schemaVersion = 1, kind, metadata = new { fileName = "legacy", sourceFormat = source, importedAt = DateTime.UtcNow.ToString("o") }, data };
        }

        private static byte[] ReadMultipartFile(HttpListenerRequest request, int maxBytes)
        {
            var contentType = request.ContentType ?? string.Empty;
            if (!contentType.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("Multipart upload required.");
            var boundaryMarker = "boundary=";
            var boundaryIndex = contentType.IndexOf(boundaryMarker, StringComparison.OrdinalIgnoreCase);
            if (boundaryIndex < 0) throw new InvalidDataException("Multipart boundary is missing.");
            var boundary = contentType.Substring(boundaryIndex + boundaryMarker.Length).Trim().Trim('"');
            var body = ReadBody(request.InputStream, maxBytes);
            var marker = Encoding.UTF8.GetBytes("--" + boundary);
            var start = IndexOf(body, Encoding.UTF8.GetBytes("\r\n\r\n"), 0);
            if (start < 0) throw new InvalidDataException("Multipart file is missing.");
            start += 4;
            var end = IndexOf(body, Encoding.UTF8.GetBytes("\r\n--" + boundary), start);
            if (end < 0 || end < start) throw new InvalidDataException("Multipart boundary is invalid.");
            var file = new byte[end - start];
            Buffer.BlockCopy(body, start, file, 0, file.Length);
            return file;
        }

        private static int IndexOf(byte[] value, byte[] needle, int start)
        {
            for (var index = start; index <= value.Length - needle.Length; index++)
            {
                var matched = true;
                for (var offset = 0; offset < needle.Length; offset++)
                    if (value[index + offset] != needle[offset]) { matched = false; break; }
                if (matched) return index;
            }
            return -1;
        }

        private static byte[] ReadBody(Stream input, int maxBytes)
        {
            using (var output = new MemoryStream())
            {
                var buffer = new byte[81920];
                int read;
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    if (output.Length + read > maxBytes) throw new InvalidDataException("Request is too large.");
                    output.Write(buffer, 0, read);
                }
                return output.ToArray();
            }
        }

        private static string GetQuery(Uri url, string key)
        {
            var prefix = key + "=";
            foreach (var part in (url.Query ?? string.Empty).TrimStart('?').Split('&'))
                if (part.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return Uri.UnescapeDataString(part.Substring(prefix.Length));
            return string.Empty;
        }

        private static void WriteJson(HttpListenerResponse response, object value)
        {
            var bytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(value));
            response.ContentType = "application/json";
            response.OutputStream.Write(bytes, 0, bytes.Length);
        }

        private static void WriteError(HttpListenerResponse response, int status, string message)
        {
            response.StatusCode = status;
            WriteJson(response, new { message });
        }

        private sealed class CanonicalEnvelope
        {
            public string kind { get; set; }
            public Newtonsoft.Json.Linq.JObject data { get; set; }
        }

        private sealed class CriteriaPayload
        {
            public List<FinalThesisGradingItem> items { get; set; }
        }
    }
}
