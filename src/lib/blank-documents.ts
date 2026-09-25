import type { DefenseGrading, FinalThesisGradingItem, ThesisComment, WorkflowDocument } from '../types/models'

export function blankThesisComment(): WorkflowDocument {
  const comment: ThesisComment = {
    Teacher: '',
    DT: new Date().toISOString(),
    SubjectCode: '',
    ClassName: '',
    Semester: '',
    Password: '',
    TitleVN: '',
    TitleEN: '',
    Content: '',
    Form: '',
    Attitude: '',
    Achievement: '',
    Limitation: '',
    Conclusion: [],
  }
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind: 'thesis-comment',
    metadata: { fileName: 'thesis-comment.cmt', sourceFormat: 'json', importedAt: new Date().toISOString() },
    data: comment,
  }
}

export function blankCriteria(): WorkflowDocument {
  const items: FinalThesisGradingItem[] = []
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind: 'final-thesis-grading-items',
    metadata: { fileName: 'FinalThesisGradingItems.master', sourceFormat: 'json', importedAt: new Date().toISOString() },
    data: { items },
  }
}

/**
 * Legacy FrmDefenseGrading rejects an evaluator name with accents or non-letters, because the
 * name is embedded verbatim in the generated .tef filename.
 */
export function isPlainEvaluatorName(name: string) {
  return /^[A-Za-z ]+$/.test(name)
}

/** Master criteria whose subject code matches, in the legacy case-insensitive comparison. */
export function criteriaForSubject(criteria: FinalThesisGradingItem[], subjectCode: string) {
  const needle = subjectCode.trim().toUpperCase()
  return criteria.filter((item) => item.SubjectCode.trim().toUpperCase() === needle)
}

/** Legacy FrmDefenseGrading derives a defense sheet from a supervisor .cmt plus master criteria. */
export function defenseFromComment(
  comment: ThesisComment,
  criteria: FinalThesisGradingItem[],
  gradedTeacher: string,
): DefenseGrading | { error: string } {
  const evaluator = gradedTeacher.trim()
  if (!evaluator) return { error: 'Evaluator full name is required.' }
  if (!isPlainEvaluatorName(evaluator)) {
    return { error: 'Evaluator full name cannot contain accents or non-alphabetic characters.' }
  }
  const matching = criteriaForSubject(criteria, comment.SubjectCode)
  if (!matching.length) {
    return { error: `No master criteria found for subject ${comment.SubjectCode || '(empty)'}.` }
  }
  if (!comment.Conclusion.length) {
    return { error: 'This thesis comment has no students to grade.' }
  }
  return {
    SubjectCode: comment.SubjectCode,
    TitleVN: comment.TitleVN,
    TitleEN: comment.TitleEN,
    Supervisor: comment.Teacher,
    ClassName: comment.ClassName,
    Semester: comment.Semester,
    GroupMark: 0,
    GradedTime: new Date().toISOString(),
    GradedTeacher: evaluator,
    SupervisorComment: comment,
    Password: '',
    Note: '',
    GradeStudents: comment.Conclusion.map((student) => ({
      Roll: student.Roll,
      Name: student.Name,
      Conclusion: student.Agree_to_defense?.trim().toLowerCase() === 'x' ? 'Agree to defense' : null,
      GradedItems: matching.map((item) => ({
        GroupItem: item.ItemGroup || null,
        ItemName: item.GradingItem,
        Scale: item.Scale,
        GroupMark: 0,
        Mark: 0,
      })),
    })),
  }
}
