import type { DefenseGrading, DefenseStudentGrade, FinalGrade, FinalGradeOfTeacher, GradedTeacherSummary, SummaryResult } from '../types/models'

export function roundAwayFromZero(value: number, digits = 1) {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** digits
  const scaled = value * factor
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5)
  return rounded / factor
}

export function studentMark(student: DefenseStudentGrade) {
  return roundAwayFromZero(student.GradedItems.reduce((sum, item) => sum + roundAwayFromZero(item.Mark, 1), 0), 1)
}

export function groupSignature(defense: DefenseGrading) {
  return {
    Semester: defense.Semester,
    SubjectCode: defense.SubjectCode,
    ClassName: defense.ClassName,
    Rolls: defense.GradeStudents.map((student) => student.Roll),
  }
}

export function sameGroup(a: DefenseGrading, b: DefenseGrading) {
  const left = groupSignature(a)
  const right = groupSignature(b)
  return left.Semester === right.Semester && left.SubjectCode === right.SubjectCode && left.ClassName === right.ClassName &&
    left.Rolls.length === right.Rolls.length && left.Rolls.every((roll, index) => roll === right.Rolls[index])
}

export function summarizeDefenseGroup(defenses: DefenseGrading[]): SummaryResult | { error: string } {
  if (!defenses.length) return { error: 'No defense evaluation files were provided.' }
  const first = defenses[0]
  if (!defenses.every((candidate) => sameGroup(first, candidate))) {
    return { error: 'All evaluation files must describe the same semester, subject, class, and student rolls.' }
  }
  const scale = first.GradeStudents[0]?.GradedItems.reduce((sum, item) => sum + item.Scale, 0) ?? 0
  const grades: FinalGrade[] = first.GradeStudents.map((student) => ({
    Roll: student.Roll,
    Name: student.Name,
    SubjectCode: first.SubjectCode,
    ClassName: first.ClassName,
    Semester: first.Semester,
    Supervisor: first.Supervisor,
    Title: titleOf(first),
    Scale: scale,
    Note: student.Conclusion == null ? 'Disagree to defense' : '',
    DateTime: first.GradedTime,
    GradedBy: '',
    ListFGOT: [],
    AvgMark: 0,
  }))
  const teachers: GradedTeacherSummary[] = []
  defenses.forEach((defense) => {
    teachers.push({
      Name: defense.GradedTeacher,
      Subject: defense.SubjectCode,
      GroupName: defense.ClassName,
      Title: `${defense.TitleEN}/${defense.TitleVN}`,
      Supervisor: defense.Supervisor,
      DT: defense.GradedTime,
    })
    defense.GradeStudents.forEach((student) => {
      const grade = grades.find((candidate) => candidate.Roll === student.Roll)
      if (!grade) return
      const mark: FinalGradeOfTeacher = { GradedTeacher: defense.GradedTeacher, Mark: studentMark(student) }
      grade.ListFGOT.push(mark)
      grade.GradedBy += `${defense.GradedTeacher}, `
      if (student.Conclusion == null) grade.Note = 'Disagree to defense'
      else if (defense.Note.trim()) grade.Note += `${defense.GradedTeacher}: ${defense.Note}; `
    })
  })
  grades.forEach((grade) => {
    grade.AvgMark = grade.ListFGOT.length ? roundAwayFromZero(grade.ListFGOT.reduce((sum, item) => sum + item.Mark, 0) / grade.ListFGOT.length, 1) : 0
  })
  return { grades, teachers, groups: 1, students: first.GradeStudents.length }
}

export function titleOf(defense: DefenseGrading) {
  if (!defense.TitleEN.trim()) return defense.TitleVN
  if (!defense.TitleVN.trim()) return defense.TitleEN
  return `${defense.TitleEN}/${defense.TitleVN}`
}
