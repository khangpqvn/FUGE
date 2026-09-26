using System;
using FuGrade;

namespace FuGrade.LegacyBridge.Validation
{
    internal static class CanonicalValidator
    {
        public static void ValidateThesisComment(ThesisComment value)
        {
            if (value == null) throw new ArgumentException("Thesis comment is missing.");
            if (value.Conclusion == null) throw new ArgumentException("Thesis comment students are missing.");
        }

        public static void ValidateDefense(DefenseGrading value)
        {
            if (value == null) throw new ArgumentException("Defense evaluation is missing.");
            if (value.GradeStudents == null) throw new ArgumentException("Defense students are missing.");
            foreach (var student in value.GradeStudents)
            {
                if (student == null || student.GradedItems == null) throw new ArgumentException("Defense grading items are missing.");
                foreach (var item in student.GradedItems)
                    if (item == null || item.Scale < 0 || item.Mark < 0 || item.Mark > item.Scale || item.GroupMark < 0 || item.GroupMark > item.Scale)
                        throw new ArgumentException("Defense marks are invalid.");
            }
        }
    }
}
