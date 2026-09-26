import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { SummaryResult } from '../types/models'
import { summaryWorkbookData, summaryWorkbookBlob } from './xlsx-export'

const result: SummaryResult = {
  groups: 1,
  students: 1,
  grades: [{ Roll: 'HE1', Name: 'Student', SubjectCode: 'SEP490', ClassName: 'G5', Semester: 'Summer2026', Supervisor: 'Supervisor', Title: 'Thesis', Scale: 10, Note: '', DateTime: '2026-08-28', GradedBy: 'Alice, ', ListFGOT: [{ GradedTeacher: 'Alice', Mark: 8.5 }], AvgMark: 8.5 }],
  teachers: [{ Name: 'Alice', Subject: 'SEP490', GroupName: 'G5', Title: 'Thesis', Supervisor: 'Supervisor', DT: '2026-08-28' }],
}

describe('xlsx summary export', () => {
  it('keeps legacy sheets and headers', () => {
    const { summaryRows, teacherRows } = summaryWorkbookData(result)
    expect(summaryRows[0]).toEqual(['No', 'Roll Number', 'Full Name', 'Subject code', 'Class', 'Semester', 'Thesis title', 'Supervisor', 'Date-Time', 'Group Note', 'Mark', 'Scale', 'Alice'])
    expect(teacherRows[0]).toEqual(['No', 'Teacher', 'Subject', 'Group Name', 'Title', 'Supervisor', 'Time'])
  })

  it('creates a readable xlsx workbook', async () => {
    const workbook = XLSX.read(await summaryWorkbookBlob(result).arrayBuffer())
    expect(workbook.SheetNames).toEqual(['Summary', 'Graded statistics'])
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Summary, { header: 1 })[1]).toContain('HE1')
  })
})
