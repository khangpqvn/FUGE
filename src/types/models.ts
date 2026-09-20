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
  Agree_to_defense: string
  Revised_for_the_second_defense: string
  Disagree_to_defense: string
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
  GroupItem: string
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
  Note: string
  GradeStudents: DefenseStudentGrade[]
}
