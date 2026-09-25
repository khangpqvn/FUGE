import { describe, expect, it } from 'vitest'
import { blankCriteria, blankThesisComment, criteriaForSubject, defenseFromComment, isPlainEvaluatorName } from './blank-documents'
import { validatePayload } from './document-validation'
import type { FinalThesisGradingItem, ThesisComment } from '../types/models'

const criteria: FinalThesisGradingItem[] = [
  { SubjectCode: 'SEP490', Major: 'SE', Minor: '', ItemGroup: 'Content', GradingItem: 'Solution quality', Scale: 3 },
  { SubjectCode: 'SEP490', Major: 'SE', Minor: '', ItemGroup: 'Content', GradingItem: 'Completeness', Scale: 3 },
  { SubjectCode: 'sep490', Major: 'SE', Minor: '', ItemGroup: 'Delivery', GradingItem: 'Presentation', Scale: 4 },
  { SubjectCode: 'PRN231', Major: 'SE', Minor: '', ItemGroup: '', GradingItem: 'Unrelated', Scale: 5 },
]

function comment(overrides: Partial<ThesisComment> = {}): ThesisComment {
  return {
    Teacher: 'Supervisor A',
    DT: '2026-09-20T00:00:00.000Z',
    SubjectCode: 'SEP490',
    ClassName: 'SE1732',
    Semester: 'Summer 2026',
    Password: '',
    TitleVN: 'Tiêu đề',
    TitleEN: 'Title',
    Content: 'c',
    Form: 'f',
    Attitude: 'a',
    Achievement: 'ac',
    Limitation: 'l',
    Conclusion: [
      { Roll: 'HE1', Name: 'A', Agree_to_defense: 'x', Revised_for_the_second_defense: null, Disagree_to_defense: null, Note: '' },
      { Roll: 'HE2', Name: 'B', Agree_to_defense: null, Revised_for_the_second_defense: null, Disagree_to_defense: 'x', Note: '' },
    ],
    ...overrides,
  }
}

describe('blank documents', () => {
  it('creates an empty thesis comment that reports its missing sections', () => {
    const document = blankThesisComment()
    expect(document.kind).toBe('thesis-comment')
    expect(validatePayload(document.kind, document.data).length).toBeGreaterThan(0)
  })

  it('creates an empty criteria document that already validates', () => {
    const document = blankCriteria()
    expect(document.kind).toBe('final-thesis-grading-items')
    expect(validatePayload(document.kind, document.data)).toEqual([])
  })
})

describe('evaluator name rule from legacy IsWithoutAccents', () => {
  it('accepts plain letters and spaces', () => {
    expect(isPlainEvaluatorName('Nguyen Van An')).toBe(true)
  })

  it('rejects accents, digits and punctuation', () => {
    expect(isPlainEvaluatorName('Nguyễn Văn An')).toBe(false)
    expect(isPlainEvaluatorName('Teacher 1')).toBe(false)
    expect(isPlainEvaluatorName('A.B')).toBe(false)
    expect(isPlainEvaluatorName('')).toBe(false)
  })
})

describe('criteriaForSubject', () => {
  it('matches the subject code case-insensitively and ignores other subjects', () => {
    const matched = criteriaForSubject(criteria, ' sep490 ')
    expect(matched.map((item) => item.GradingItem)).toEqual(['Solution quality', 'Completeness', 'Presentation'])
  })
})

describe('defenseFromComment', () => {
  it('builds one grid row per criterion for every student, in criteria order', () => {
    const result = defenseFromComment(comment(), criteria, 'Evaluator One')
    if ('error' in result) throw new Error(result.error)
    expect(result.GradeStudents).toHaveLength(2)
    for (const student of result.GradeStudents) {
      expect(student.GradedItems.map((item) => item.ItemName)).toEqual(['Solution quality', 'Completeness', 'Presentation'])
      expect(student.GradedItems.map((item) => item.Scale)).toEqual([3, 3, 4])
      expect(student.GradedItems.every((item) => item.Mark === 0 && item.GroupMark === 0)).toBe(true)
    }
  })

  it('carries the agree/disagree conclusion from the supervisor comment', () => {
    const result = defenseFromComment(comment(), criteria, 'Evaluator One')
    if ('error' in result) throw new Error(result.error)
    expect(result.GradeStudents[0].Conclusion).toBe('Agree to defense')
    expect(result.GradeStudents[1].Conclusion).toBeNull()
  })

  it('embeds the supervisor comment and copies its metadata', () => {
    const source = comment()
    const result = defenseFromComment(source, criteria, 'Evaluator One')
    if ('error' in result) throw new Error(result.error)
    expect(result.SupervisorComment).toEqual(source)
    expect(result.Supervisor).toBe('Supervisor A')
    expect(result.ClassName).toBe('SE1732')
    expect(result.TitleVN).toBe('Tiêu đề')
  })

  it('produces a document that passes defense validation', () => {
    const result = defenseFromComment(comment(), criteria, 'Evaluator One')
    if ('error' in result) throw new Error(result.error)
    expect(validatePayload('defense-grading', result)).toEqual([])
  })

  it('refuses an evaluator name the legacy .tef filename could not hold', () => {
    expect(defenseFromComment(comment(), criteria, 'Nguyễn Văn An')).toHaveProperty('error')
    expect(defenseFromComment(comment(), criteria, '  ')).toHaveProperty('error')
  })

  it('refuses a subject with no master criteria', () => {
    expect(defenseFromComment(comment({ SubjectCode: 'XXX999' }), criteria, 'Evaluator One')).toHaveProperty('error')
  })

  it('refuses a thesis comment with no students', () => {
    expect(defenseFromComment(comment({ Conclusion: [] }), criteria, 'Evaluator One')).toHaveProperty('error')
  })
})
