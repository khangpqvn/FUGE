import type { DocumentKind } from '../../types/models'

export const LEGACY_ASSEMBLY = 'FuGrade, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null'

export const LEGACY_FIELDS = {
  ThesisComment: ['<Teacher>k__BackingField', '<DT>k__BackingField', '<SubjectCode>k__BackingField', '<ClassName>k__BackingField', '<Semester>k__BackingField', '<Password>k__BackingField', '<TitleVN>k__BackingField', '<TitleEN>k__BackingField', '<Content>k__BackingField', '<Form>k__BackingField', '<Attitude>k__BackingField', '<Achievement>k__BackingField', '<Limitation>k__BackingField', '<Conclusion>k__BackingField'],
  ThesisStudent: ['<Roll>k__BackingField', '<Name>k__BackingField', '<Agree_to_defense>k__BackingField', '<Revised_for_the_second_defense>k__BackingField', '<Disagree_to_defense>k__BackingField', '<Note>k__BackingField'],
  DefenseGrading: ['<SubjectCode>k__BackingField', '<TitleVN>k__BackingField', '<TitleEN>k__BackingField', '<Supervisor>k__BackingField', '<ClassName>k__BackingField', '<Semester>k__BackingField', '<GroupMark>k__BackingField', '<GradedTime>k__BackingField', '<GradedTeacher>k__BackingField', '<SupervisorComment>k__BackingField', '<Password>k__BackingField', '<Note>k__BackingField', '<GradeStudents>k__BackingField'],
  DefenseStudentGrade: ['<Roll>k__BackingField', '<Name>k__BackingField', '<Conclusion>k__BackingField', '<GradedItems>k__BackingField'],
  GradedItem: ['<GroupItem>k__BackingField', '<ItemName>k__BackingField', '<Scale>k__BackingField', '<GroupMark>k__BackingField', '<Mark>k__BackingField'],
  FinalThesisGradingItem: ['<SubjectCode>k__BackingField', '<Major>k__BackingField', '<Minor>k__BackingField', '<ItemGroup>k__BackingField', '<GradingItem>k__BackingField', '<Scale>k__BackingField'],
} as const

export const ROOT_BY_KIND: Record<Exclude<DocumentKind, 'teacher-grade'>, string> = {
  'thesis-comment': 'FuGrade.ThesisComment',
  'defense-grading': 'FuGrade.DefenseGrading',
  'final-thesis-grading-items': 'System.Collections.Generic.List`1',
}

export function isKnownField(typeName: keyof typeof LEGACY_FIELDS, field: string) {
  return (LEGACY_FIELDS[typeName] as readonly string[]).includes(field)
}
