import * as XLSX from 'xlsx'
import type { SummaryResult } from '../types/models'

const SUMMARY_HEADERS = [
  'No', 'Roll Number', 'Full Name', 'Subject code', 'Class', 'Semester',
  'Thesis title', 'Supervisor', 'Date-Time', 'Group Note', 'Mark', 'Scale',
]
const TEACHER_HEADERS = ['No', 'Teacher', 'Subject', 'Group Name', 'Title', 'Supervisor', 'Time']

export function summaryWorkbookData(result: SummaryResult) {
  const teacherNames = Array.from(new Set(result.grades.flatMap((grade) => grade.ListFGOT.map((teacher) => teacher.GradedTeacher))))
  const summaryRows = [
    [...SUMMARY_HEADERS, ...teacherNames],
    ...result.grades.map((grade, index) => [
      String(index + 1), grade.Roll, grade.Name, grade.SubjectCode, grade.ClassName, grade.Semester,
      grade.Title, grade.Supervisor, grade.DateTime, grade.Note, grade.AvgMark, grade.Scale,
      ...teacherNames.map((name) => grade.ListFGOT.find((teacher) => teacher.GradedTeacher === name)?.Mark ?? ''),
    ]),
  ]
  const teacherRows = [
    TEACHER_HEADERS,
    ...result.teachers.map((teacher, index) => [
      index + 1, teacher.Name, teacher.Subject, teacher.GroupName, teacher.Title, teacher.Supervisor, teacher.DT,
    ]),
  ]
  return { summaryRows, teacherRows }
}

export function summaryWorkbook(result: SummaryResult) {
  const { summaryRows, teacherRows } = summaryWorkbookData(result)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(teacherRows), 'Graded statistics')
  return workbook
}

export function summaryWorkbookBlob(result: SummaryResult) {
  const bytes = XLSX.write(summaryWorkbook(result), { bookType: 'xlsx', type: 'array' })
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
