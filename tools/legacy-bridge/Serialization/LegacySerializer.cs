using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;
using System.Runtime.Serialization;

namespace FuGrade.LegacyBridge.Serialization
{
    internal static class LegacySerializer
    {
        public static object Deserialize(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0 || bytes.Length > 8 * 1024 * 1024)
                throw new InvalidDataException("Legacy payload is empty or too large.");

#pragma warning disable SYSLIB0011
            var formatter = new BinaryFormatter { Binder = new AllowlistedBinder() };
            using (var stream = new MemoryStream(bytes, writable: false))
                return formatter.Deserialize(stream);
#pragma warning restore SYSLIB0011
        }

        public static byte[] Serialize(object value)
        {
            if (value == null) throw new ArgumentNullException(nameof(value));
#pragma warning disable SYSLIB0011
            var formatter = new BinaryFormatter { Binder = new AllowlistedBinder() };
            using (var stream = new MemoryStream())
            {
                formatter.Serialize(stream, value);
                if (stream.Length > 8 * 1024 * 1024) throw new InvalidDataException("Legacy payload is too large.");
                return stream.ToArray();
            }
#pragma warning restore SYSLIB0011
        }
    }
}
