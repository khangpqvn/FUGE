export type GradeValue = number | null

export interface GradeComponent {
  Component: string
  Grade: GradeValue
}

export interface Student {
  Roll: string
  Name: string
  Comment: string
  Grades: GradeComponent[]
}

export interface SubjectClassGrade {
  Subject: string
  Class: string
  Students: Student[]
  Components: string[]
}

export interface TeacherGrade {
  Version: string
  Semester: string
  Login: string
  Password: string
  SubjectClassGrades: SubjectClassGrade[]
}

export interface ThesisStudent {
  Roll: string
  Name: string
  Agree_to_defense: string | null
  Revised_for_the_second_defense: string | null
  Disagree_to_defense: string | null
  Note: string
}

export interface ThesisComment {
  Teacher: string
  DT: string
  SubjectCode: string
  ClassName: string
  Semester: string
  Password: string
  TitleVN: string
  TitleEN: string
  Content: string
  Form: string
  Attitude: string
  Achievement: string
  Limitation: string
  Conclusion: ThesisStudent[]
}

export interface FinalThesisGradingItem {
  SubjectCode: string
  Major: string
  Minor: string
  ItemGroup: string
  GradingItem: string
  Scale: number
}

export interface GradedItem {
  GroupItem: string | null
  ItemName: string
  Scale: number
  GroupMark: number
  Mark: number
}

export interface DefenseStudentGrade {
  Roll: string
  Name: string
  Conclusion: string | null
  GradedItems: GradedItem[]
}

export interface DefenseGrading {
  SubjectCode: string
  TitleVN: string
  TitleEN: string
  Supervisor: string
  ClassName: string
  Semester: string
  GroupMark: number
  GradedTime: string
  GradedTeacher: string
  SupervisorComment: ThesisComment | null
  Password: string
  Note: string
  GradeStudents: DefenseStudentGrade[]
}

export type DocumentKind = 'teacher-grade' | 'thesis-comment' | 'defense-grading' | 'final-thesis-grading-items'
export type SourceFormat = 'fg' | 'cmt' | 'tef' | 'master' | 'json'

export interface CanonicalMetadata {
  fileName: string
  sourceFormat: SourceFormat
  sourceLegacyType?: string
  importedAt: string
}

export interface CanonicalDocument<T> {
  format: 'fugrade.canonical'
  schemaVersion: 1
  kind: DocumentKind
  metadata: CanonicalMetadata
  data: T
}

export interface FinalGradeOfTeacher {
  GradedTeacher: string
  Mark: number
}

export interface FinalGrade {
  Roll: string
  Name: string
  SubjectCode: string
  ClassName: string
  Semester: string
  Supervisor: string
  Title: string
  Scale: number
  Note: string
  DateTime: string
  GradedBy: string
  ListFGOT: FinalGradeOfTeacher[]
  AvgMark: number
}

export interface GradedTeacherSummary {
  Name: string
  Subject: string
  GroupName: string
  Title: string
  Supervisor: string
  DT: string
}

export interface DefenseGroupSignature {
  Semester: string
  SubjectCode: string
  ClassName: string
  Rolls: string[]
}

export interface SummaryResult {
  grades: FinalGrade[]
  teachers: GradedTeacherSummary[]
  groups: number
  students: number
}

export type FinalThesisGradingItemsDocument = CanonicalDocument<{ items: FinalThesisGradingItem[] }>
export type WorkflowDocument =
  | CanonicalDocument<TeacherGrade>
  | CanonicalDocument<ThesisComment>
  | CanonicalDocument<DefenseGrading>
  | FinalThesisGradingItemsDocument
