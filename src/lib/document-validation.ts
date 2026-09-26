import type { DefenseGrading, DocumentKind, FinalThesisGradingItem, ThesisComment, TeacherGrade } from '../types/models'

export function validatePayload(kind: DocumentKind, data: unknown): string[] {
  const errors: string[] = []
  if (!isRecord(data)) return ['Document payload must be an object.']

  if (kind === 'teacher-grade') {
    const sheet = data as TeacherGrade
    if (!Array.isArray(sheet.SubjectClassGrades)) errors.push('SubjectClassGrades must be a list.')
    else sheet.SubjectClassGrades.forEach((group, groupIndex) => {
      if (!Array.isArray(group.Students) || !Array.isArray(group.Components)) {
        errors.push(`Group ${groupIndex + 1} has invalid students or components.`)
        return
      }
      group.Students.forEach((student) => student.Grades?.forEach((grade) => {
        if (grade.Grade !== null && (!Number.isFinite(grade.Grade) || grade.Grade < 0 || grade.Grade > 10)) {
          errors.push(`${student.Roll}: ${grade.Component} must be between 0 and 10.`)
        }
        if (grade.Component.trim().toLowerCase() === 'status' && grade.Grade !== null && grade.Grade !== 0 && grade.Grade !== 1) {
          errors.push(`${student.Roll}: Status must be 0, 1, or empty.`)
        }
      }))
    })
  }

  if (kind === 'thesis-comment') {
    const comment = data as ThesisComment
    for (const field of ['TitleVN', 'TitleEN', 'Content', 'Form', 'Attitude', 'Achievement', 'Limitation'] as const) {
      if (!comment[field]?.trim()) errors.push(`${field} is required.`)
    }
    if (!Array.isArray(comment.Conclusion)) errors.push('Conclusion must be a list.')
    else {
      if (comment.Conclusion.length === 0) errors.push('At least one student is required in Conclusion.')
      if (comment.Conclusion.length > 6) errors.push('Thesis group cannot exceed 6 students (MaxThesisGroupSize = 6).')
      comment.Conclusion.forEach((student) => {
        const flags = [student.Agree_to_defense, student.Revised_for_the_second_defense, student.Disagree_to_defense]
        if (flags.filter((value) => value?.trim().toLowerCase() === 'x').length !== 1) {
          errors.push(`${student.Roll || student.Name}: choose exactly one defense conclusion.`)
        }
        if (flags.some((value) => value && !['x', 'X'].includes(value))) errors.push(`${student.Roll}: conclusion values must be x or empty.`)
      })
    }
  }

  if (kind === 'defense-grading') {
    const defense = data as DefenseGrading
    if (!defense.GradedTeacher?.trim()) {
      errors.push('Evaluator name (GradedTeacher) is required.')
    } else if (!/^[A-Za-z ]+$/.test(defense.GradedTeacher.trim())) {
      errors.push('Evaluator name can only contain English letters (A-Z, a-z) and spaces without accents.')
    }
    if (!Array.isArray(defense.GradeStudents) || defense.GradeStudents.length === 0) {
      errors.push('At least one student is required in defense.')
    } else {
      if (defense.GradeStudents.length > 6) errors.push('Defense group cannot exceed 6 students (MaxThesisGroupSize = 6).')
      defense.GradeStudents.forEach((student) => student.GradedItems?.forEach((item) => {
        if (!Number.isFinite(item.Scale) || item.Scale < 0) errors.push(`${student.Roll}: ${item.ItemName} has an invalid scale.`)
        if (!Number.isFinite(item.Mark) || item.Mark < 0 || item.Mark > item.Scale) errors.push(`${student.Roll}: ${item.ItemName} mark must be between 0 and ${item.Scale}.`)
        if (!Number.isFinite(item.GroupMark) || item.GroupMark < 0 || item.GroupMark > item.Scale) errors.push(`${student.Roll}: ${item.ItemName} group mark must be between 0 and ${item.Scale}.`)
      }))
    }
  }

  if (kind === 'final-thesis-grading-items') {
    const items = (data as { items?: FinalThesisGradingItem[] }).items
    if (!Array.isArray(items)) errors.push('Master criteria must be a list.')
    else {
      const seen = new Set<string>()
      items.forEach((item) => {
        if (!item.SubjectCode?.trim() || !item.GradingItem?.trim()) errors.push('Each criterion needs a subject code and item name.')
        if (!Number.isFinite(item.Scale) || item.Scale <= 0) errors.push(`${item.GradingItem || 'Criterion'} scale must be greater than zero.`)
        const key = `${item.SubjectCode.trim().toLowerCase()}\u0000${item.GradingItem.trim().toLowerCase()}`
        if (seen.has(key)) errors.push(`${item.SubjectCode}: duplicate criterion “${item.GradingItem}”.`)
        seen.add(key)
      })
    }
  }

  return errors
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
