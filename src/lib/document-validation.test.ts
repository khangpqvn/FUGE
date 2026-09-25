import { describe, expect, it } from 'vitest'
import { validatePayload } from './document-validation'
import type { DefenseGrading, TeacherGrade, ThesisComment } from '../types/models'

function sheet(grade: number | null, component = 'Presentation'): TeacherGrade {
  return {
    Version: '1.1',
    Semester: 'Summer 2026',
    Login: 'teacher',
    Password: '',
    SubjectClassGrades: [
      {
        Subject: 'SEP490',
        Class: 'SE1732',
        Components: [component],
        Students: [{ Roll: 'HE1', Name: 'A', Comment: '', Grades: [{ Component: component, Grade: grade }] }],
      },
    ],
  }
}

function comment(overrides: Partial<ThesisComment> = {}): ThesisComment {
  return {
    Teacher: 'sup',
    DT: new Date('2026-09-21T00:00:00.000Z').toISOString(),
    SubjectCode: 'SEP490',
    ClassName: 'SE1732',
    Semester: 'Summer 2026',
    Password: '',
    TitleVN: 'Tiêu đề',
    TitleEN: 'Title',
    Content: 'content',
    Form: 'form',
    Attitude: 'attitude',
    Achievement: 'achievement',
    Limitation: 'limitation',
    Conclusion: [
      { Roll: 'HE1', Name: 'A', Agree_to_defense: 'x', Revised_for_the_second_defense: null, Disagree_to_defense: null, Note: '' },
    ],
    ...overrides,
  }
}

describe('teacher-grade validation', () => {
  it('accepts marks inside 0..10 and empty marks', () => {
    expect(validatePayload('teacher-grade', sheet(8.5))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(null))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(0))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(10))).toEqual([])
  })

  it('rejects marks outside 0..10', () => {
    expect(validatePayload('teacher-grade', sheet(10.5))).toHaveLength(1)
    expect(validatePayload('teacher-grade', sheet(-1))).toHaveLength(1)
  })

  it('restricts a Status component to 1 or 0 like the legacy grid', () => {
    expect(validatePayload('teacher-grade', sheet(1, 'Status'))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(0, 'Status'))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(null, 'Status'))).toEqual([])
    expect(validatePayload('teacher-grade', sheet(5, 'Status'))).toHaveLength(1)
  })
})

describe('thesis-comment validation', () => {
  it('accepts a complete comment', () => {
    expect(validatePayload('thesis-comment', comment())).toEqual([])
  })

  it('requires every narrative section', () => {
    expect(validatePayload('thesis-comment', comment({ Content: '  ' }))).toContain('Content is required.')
    expect(validatePayload('thesis-comment', comment({ Limitation: '' }))).toContain('Limitation is required.')
  })

  it('requires exactly one defense conclusion per student', () => {
    const none = comment({
      Conclusion: [{ Roll: 'HE1', Name: 'A', Agree_to_defense: null, Revised_for_the_second_defense: null, Disagree_to_defense: null, Note: '' }],
    })
    const both = comment({
      Conclusion: [{ Roll: 'HE1', Name: 'A', Agree_to_defense: 'x', Revised_for_the_second_defense: 'x', Disagree_to_defense: null, Note: '' }],
    })
    expect(validatePayload('thesis-comment', none)).toHaveLength(1)
    expect(validatePayload('thesis-comment', both)).toHaveLength(1)
  })

  it('rejects a conclusion flag that is not x', () => {
    const bad = comment({
      Conclusion: [{ Roll: 'HE1', Name: 'A', Agree_to_defense: 'yes', Revised_for_the_second_defense: null, Disagree_to_defense: null, Note: '' }],
    })
    expect(validatePayload('thesis-comment', bad).length).toBeGreaterThan(0)
  })
})

describe('defense-grading validation', () => {
  const defense = (mark: number, scale = 2): DefenseGrading => ({
    SubjectCode: 'SEP490',
    TitleVN: 'vn',
    TitleEN: 'en',
    Supervisor: 'sup',
    ClassName: 'SE1732',
    Semester: 'Summer 2026',
    GroupMark: 0,
    GradedTime: new Date('2026-09-21T00:00:00.000Z').toISOString(),
    GradedTeacher: 'evaluator',
    SupervisorComment: null,
    Password: '',
    Note: '',
    GradeStudents: [
      { Roll: 'HE1', Name: 'A', Conclusion: 'Agree to defense', GradedItems: [{ GroupItem: null, ItemName: 'Demo', Scale: scale, GroupMark: 0, Mark: mark }] },
    ],
  })

  it('accepts a mark inside the criterion scale', () => {
    expect(validatePayload('defense-grading', defense(2))).toEqual([])
  })

  it('rejects a mark above the criterion scale', () => {
    expect(validatePayload('defense-grading', defense(2.5)).length).toBeGreaterThan(0)
  })

  it('rejects a negative mark', () => {
    expect(validatePayload('defense-grading', defense(-0.5)).length).toBeGreaterThan(0)
  })
})

describe('master criteria validation', () => {
  const item = (overrides: Record<string, unknown> = {}) => ({
    SubjectCode: 'SEP490',
    Major: 'SE',
    Minor: '',
    ItemGroup: '',
    GradingItem: 'Demo',
    Scale: 2,
    ...overrides,
  })

  it('accepts positive scales', () => {
    expect(validatePayload('final-thesis-grading-items', { items: [item()] })).toEqual([])
  })

  it('rejects a non-positive scale', () => {
    expect(validatePayload('final-thesis-grading-items', { items: [item({ Scale: 0 })] }).length).toBeGreaterThan(0)
  })

  it('rejects a case-insensitive duplicate criterion', () => {
    const errors = validatePayload('final-thesis-grading-items', { items: [item(), item({ GradingItem: 'demo' })] })
    expect(errors.some((error) => error.includes('duplicate'))).toBe(true)
  })

  it('rejects a bare array instead of the items envelope', () => {
    expect(validatePayload('final-thesis-grading-items', [item()]).length).toBeGreaterThan(0)
  })
})
