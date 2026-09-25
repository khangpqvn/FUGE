import { describe, expect, it } from 'vitest'
import type { TeacherGrade } from '../types/models'
import {
  addComponent,
  addStudent,
  applyPastedComments,
  applyPastedMarks,
  classesShareComponents,
  clearComponent,
  mergedGroup,
  parseMark,
  parsePastedRows,
  setStudentComment,
  setStudentMark,
} from './grading-edits'

function baseSheet(): TeacherGrade {
  return {
    Version: '1.1',
    Semester: 'Summer 2026',
    Login: 'teacher',
    Password: '',
    SubjectClassGrades: [
      {
        Subject: 'SEP490',
        Class: 'SE1732',
        Components: ['Status', 'Presentation'],
        Students: [
          { Roll: 'HE1', Name: 'A', Comment: '', Grades: [{ Component: 'Status', Grade: 1 }, { Component: 'Presentation', Grade: 7 }] },
          { Roll: 'HE2', Name: 'B', Comment: '', Grades: [{ Component: 'Status', Grade: null }, { Component: 'Presentation', Grade: null }] },
        ],
      },
      {
        Subject: 'SEP490',
        Class: 'SE1733',
        Components: ['Status', 'Presentation'],
        Students: [{ Roll: 'HE3', Name: 'C', Comment: '', Grades: [{ Component: 'Status', Grade: 0 }, { Component: 'Presentation', Grade: 5 }] }],
      },
    ],
  }
}

describe('parseMark', () => {
  it('treats an empty cell as a cleared mark', () => {
    expect(parseMark('Presentation', '   ')).toEqual({ value: null })
  })

  it('accepts 0..10 for a normal component', () => {
    expect(parseMark('Presentation', '8.5')).toEqual({ value: 8.5 })
    expect(parseMark('Presentation', '11')).toHaveProperty('error')
    expect(parseMark('Presentation', 'abc')).toHaveProperty('error')
  })

  it('accepts only 1 or 0 for a Status component', () => {
    expect(parseMark('Status', '1')).toEqual({ value: 1 })
    expect(parseMark('Status', '0')).toEqual({ value: 0 })
    expect(parseMark('status', '0.5')).toHaveProperty('error')
  })
})

describe('immutable edits', () => {
  it('sets a mark without mutating the input sheet', () => {
    const sheet = baseSheet()
    const next = setStudentMark(sheet, 'HE2', 'Presentation', 9)
    expect(next.SubjectClassGrades[0].Students[1].Grades[1].Grade).toBe(9)
    expect(sheet.SubjectClassGrades[0].Students[1].Grades[1].Grade).toBeNull()
  })

  it('sets a comment on the matching roll only', () => {
    const next = setStudentComment(baseSheet(), 'HE1', 'good work')
    expect(next.SubjectClassGrades[0].Students[0].Comment).toBe('good work')
    expect(next.SubjectClassGrades[0].Students[1].Comment).toBe('')
  })

  it('clears one component across every class', () => {
    const next = clearComponent(baseSheet(), 'Presentation')
    const marks = next.SubjectClassGrades.flatMap((group) => group.Students.map((student) => student.Grades[1].Grade))
    expect(marks).toEqual([null, null, null])
  })

  it('adds a student with an empty grade per component', () => {
    const result = addStudent(baseSheet(), 0, ' he9 ', 'New Student')
    if ('error' in result) throw new Error(result.error)
    const added = result.SubjectClassGrades[0].Students.at(-1)!
    expect(added.Roll).toBe('HE9')
    expect(added.Grades.map((grade) => grade.Grade)).toEqual([null, null])
  })

  it('rejects a duplicate roll', () => {
    expect(addStudent(baseSheet(), 0, 'he1', 'A')).toHaveProperty('error')
  })

  it('adds a component to the group and to every student', () => {
    const result = addComponent(baseSheet(), 0, 'Report')
    if ('error' in result) throw new Error(result.error)
    expect(result.SubjectClassGrades[0].Components).toContain('Report')
    expect(result.SubjectClassGrades[0].Students.every((student) => student.Grades.some((grade) => grade.Component === 'Report'))).toBe(true)
  })

  it('rejects a duplicate component regardless of case', () => {
    expect(addComponent(baseSheet(), 0, 'status')).toHaveProperty('error')
  })
})

describe('merge classes', () => {
  it('merges students when every class shares the component list', () => {
    const sheet = baseSheet()
    expect(classesShareComponents(sheet)).toBe(true)
    expect(mergedGroup(sheet)!.Students).toHaveLength(3)
  })

  it('reports mismatched component lists', () => {
    const sheet = baseSheet()
    sheet.SubjectClassGrades[1].Components = ['Status']
    expect(classesShareComponents(sheet)).toBe(false)
  })
})

describe('paste import', () => {
  it('parses tab and space separated rows', () => {
    const result = parsePastedRows('HE1\t8\nHE2 9', false, true)
    if ('error' in result) throw new Error(result.error)
    expect(result.rows).toEqual([
      { roll: 'HE1', value: '8' },
      { roll: 'HE2', value: '9' },
    ])
  })

  it('skips a header row on request', () => {
    const result = parsePastedRows('roll\tmark\nHE1\t8', true, true)
    if ('error' in result) throw new Error(result.error)
    expect(result.rows).toEqual([{ roll: 'HE1', value: '8' }])
  })

  it('rejects duplicate rolls like the legacy importer', () => {
    expect(parsePastedRows('HE1\t8\nhe1\t9', false, true)).toHaveProperty('error')
  })

  it('rejects a row that has no mark when marks are expected', () => {
    expect(parsePastedRows('HE1', false, true)).toHaveProperty('error')
  })

  it('keeps multi-word comments in one value', () => {
    const result = parsePastedRows('HE1 needs more tests', false, false)
    if ('error' in result) throw new Error(result.error)
    expect(result.rows[0]).toEqual({ roll: 'HE1', value: 'needs more tests' })
  })

  it('applies marks and reports unknown rolls', () => {
    const rows = [
      { roll: 'HE1', value: '9' },
      { roll: 'HE404', value: '5' },
    ]
    const outcome = applyPastedMarks(baseSheet(), 'Presentation', rows)
    if ('error' in outcome) throw new Error(outcome.error)
    expect(outcome.applied).toBe(1)
    expect(outcome.missing).toEqual(['HE404'])
    expect(outcome.sheet.SubjectClassGrades[0].Students[0].Grades[1].Grade).toBe(9)
  })

  it('refuses the whole mark import when one value is invalid', () => {
    expect(applyPastedMarks(baseSheet(), 'Presentation', [{ roll: 'HE1', value: '42' }])).toHaveProperty('error')
  })

  it('applies comments across classes', () => {
    const outcome = applyPastedComments(baseSheet(), [{ roll: 'HE3', value: 'from class two' }])
    expect(outcome.applied).toBe(1)
    expect(outcome.sheet.SubjectClassGrades[1].Students[0].Comment).toBe('from class two')
  })
})
