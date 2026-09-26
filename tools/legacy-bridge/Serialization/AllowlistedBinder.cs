using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace FuGrade.LegacyBridge.Serialization
{
    internal sealed class AllowlistedBinder : SerializationBinder
    {
        private static readonly HashSet<string> Allowed = new HashSet<string>(StringComparer.Ordinal)
        {
            "FuGrade.ThesisComment, FuGrade",
            "FuGrade.ThesisStudent, FuGrade",
            "FuGrade.DefenseGrading, FuGrade",
            "FuGrade.DefenseStudentGrade, FuGrade",
            "FuGrade.GradedItem, FuGrade",
            "FuGrade.FinalThesisGradingItem, FuGrade",
            "FuGradeLib.Student, FuGradeLib",
            "FuGradeLib.SubjectClassGrade, FuGradeLib",
            "FuGradeLib.TeacherGrade, FuGradeLib",
            "FuGradeLib.GradeComponent, FuGradeLib",
            "System.Collections.Generic.List`1, mscorlib",
            "System.String, mscorlib",
            "System.Single, mscorlib",
            "System.Int32, mscorlib",
            "System.DateTime, mscorlib",
            "System.Object, mscorlib"
        };

        public override Type BindToType(string assemblyName, string typeName)
        {
            var simpleAssembly = assemblyName?.Split(',')[0].Trim() ?? string.Empty;
            if (typeName.StartsWith("System.Collections.Generic.List`1[[", StringComparison.Ordinal) && typeName.EndsWith("]], mscorlib", StringComparison.Ordinal))
            {
                var element = typeName.Substring("System.Collections.Generic.List`1[[".Length, typeName.Length - "System.Collections.Generic.List`1[[]], mscorlib".Length)
                    .Split(new[] { ", " }, StringSplitOptions.None)[0];
                var elementType = ResolveAllowed(element);
                return typeof(List<>).MakeGenericType(elementType);
            }
            return ResolveAllowed(typeName, simpleAssembly);
        }

        private static Type ResolveAllowed(string typeName, string assembly = "mscorlib")
        {
            var key = typeName + ", " + assembly;
            if (!Allowed.Contains(key)) throw new SerializationException("Serialized type is not allowed.");
            var resolved = Type.GetType(typeName + ", " + assembly, throwOnError: false);
            if (resolved == null) throw new SerializationException("Serialized type cannot be resolved.");
            return resolved;
        }
    }
}
