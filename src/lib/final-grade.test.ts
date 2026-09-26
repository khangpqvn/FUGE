import { describe, expect, it } from 'vitest'
import type { DefenseGrading } from '../types/models'
import { roundAwayFromZero, summarizeDefenseGroup } from './final-grade'

function defense(mark: number, teacher: string, note = ''): DefenseGrading {
  return {
    SubjectCode: 'SEP490', TitleVN: 'Đề tài', TitleEN: 'Thesis', Supervisor: 'Supervisor', ClassName: 'G5', Semester: 'Summer2026',
    GroupMark: 0, GradedTime: '2026-08-28T00:00:00.000Z', GradedTeacher: teacher, SupervisorComment: null, Password: '', Note: note,
    GradeStudents: [{ Roll: 'HE1', Name: 'Student', Conclusion: 'Agree to defense', GradedItems: [
      { GroupItem: null, ItemName: 'Design', Scale: 10, GroupMark: 0, Mark: mark },
    ] }],
  }
}

describe('final grade aggregation', () => {
  it('rounds ties away from zero', () => {
    expect(roundAwayFromZero(1.25, 1)).toBe(1.3)
    expect(roundAwayFromZero(-1.25, 1)).toBe(-1.3)
  })

  it('matches legacy teacher and average rounding', () => {
    const first = defense(1.25, 'Alice')
    first.GradeStudents[0].GradedItems.push({ GroupItem: null, ItemName: 'Testing', Scale: 10, GroupMark: 0, Mark: 1.25 })
    const second = defense(1.35, 'Bob', 'review')
    second.GradeStudents[0].GradedItems.push({ GroupItem: null, ItemName: 'Testing', Scale: 10, GroupMark: 0, Mark: 1.35 })
    const result = summarizeDefenseGroup([first, second])
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.grades[0].ListFGOT).toEqual([{ GradedTeacher: 'Alice', Mark: 2.6 }, { GradedTeacher: 'Bob', Mark: 2.8 }])
    expect(result.grades[0].AvgMark).toBe(2.7)
    expect(result.grades[0].Note).toContain('Bob: review; ')
  })

  it('rejects mixed group signatures', () => {
    const other = defense(2, 'Bob')
    other.ClassName = 'G6'
    expect(summarizeDefenseGroup([defense(1, 'Alice'), other])).toEqual({
      error: 'All evaluation files must describe the same semester, subject, class, and student rolls.',
    })
  })
})
