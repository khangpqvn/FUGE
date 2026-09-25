import type { GradeValue, Student, SubjectClassGrade, TeacherGrade } from '../types/models'

export const MERGED_CLASS_LABEL = '[All classes]'

/** Legacy FrmFuGrade treats a "Status" column as pass/fail instead of a 0..10 mark. */
export function isStatusComponent(component: string) {
  return component.trim().toLowerCase() === 'status'
}

export function parseMark(component: string, raw: string): { value: GradeValue } | { error: string } {
  const text = raw.trim()
  if (text === '') return { value: null }
  const value = Number(text)
  if (!Number.isFinite(value)) return { error: 'Mark must be a number.' }
  if (isStatusComponent(component)) {
    if (value !== 0 && value !== 1) return { error: 'Status must be 1 (pass) or 0 (fail).' }
    return { value }
  }
  if (value < 0 || value > 10) return { error: 'Mark must be between 0 and 10.' }
  return { value }
}

function mapGroups(sheet: TeacherGrade, mapper: (group: SubjectClassGrade) => SubjectClassGrade): TeacherGrade {
  return { ...sheet, SubjectClassGrades: sheet.SubjectClassGrades.map(mapper) }
}

function mapStudent(group: SubjectClassGrade, roll: string, mapper: (student: Student) => Student): SubjectClassGrade {
  if (!group.Students.some((student) => student.Roll === roll)) return group
  return { ...group, Students: group.Students.map((student) => (student.Roll === roll ? mapper(student) : student)) }
}

export function setStudentComment(sheet: TeacherGrade, roll: string, comment: string): TeacherGrade {
  return mapGroups(sheet, (group) => mapStudent(group, roll, (student) => ({ ...student, Comment: comment })))
}

export function groupLabel(group: Pick<SubjectClassGrade, 'Subject' | 'Class'>) {
  return `${group.Subject}/${group.Class}`
}

export function mergedGroup(sheet: TeacherGrade): SubjectClassGrade | null {
  const first = sheet.SubjectClassGrades[0]
  if (!first) return null
  return {
    Subject: first.Subject,
    Class: MERGED_CLASS_LABEL,
    Components: first.Components,
    Students: sheet.SubjectClassGrades.flatMap((group) => group.Students),
  }
}

/** Legacy hides the merge option when classes do not share the same component list. */
export function classesShareComponents(sheet: TeacherGrade) {
  const [first, ...rest] = sheet.SubjectClassGrades
  if (!first) return false
  const signature = first.Components.join(';')
  return rest.every((group) => group.Components.join(';') === signature)
}

export function addStudent(sheet: TeacherGrade, groupIndex: number, roll: string, name: string): TeacherGrade | { error: string } {
  const trimmedRoll = roll.trim().toUpperCase()
  if (!trimmedRoll) return { error: 'Roll number is required.' }
  const group = sheet.SubjectClassGrades[groupIndex]
  if (!group) return { error: 'Select a subject/class first.' }
  if (group.Students.some((student) => student.Roll.trim().toUpperCase() === trimmedRoll)) {
    return { error: `Student ${trimmedRoll} already exists in ${groupLabel(group)}.` }
  }
  const student: Student = {
    Roll: trimmedRoll,
    Name: name.trim(),
    Comment: '',
    Grades: group.Components.map((component) => ({ Component: component, Grade: null })),
  }
  return {
    ...sheet,
    SubjectClassGrades: sheet.SubjectClassGrades.map((candidate, index) =>
      index === groupIndex ? { ...candidate, Students: [...candidate.Students, student] } : candidate,
    ),
  }
}

export function addComponent(sheet: TeacherGrade, groupIndex: number, component: string): TeacherGrade | { error: string } {
  const name = component.trim()
  if (!name) return { error: 'Component name is required.' }
  const group = sheet.SubjectClassGrades[groupIndex]
  if (!group) return { error: 'Select a subject/class first.' }
  if (group.Components.some((existing) => existing.trim().toLowerCase() === name.toLowerCase())) {
    return { error: `Component “${name}” already exists.` }
  }
  return {
    ...sheet,
    SubjectClassGrades: sheet.SubjectClassGrades.map((candidate, index) =>
      index === groupIndex
        ? {
            ...candidate,
            Components: [...candidate.Components, name],
            Students: candidate.Students.map((student) => ({
              ...student,
              Grades: [...student.Grades, { Component: name, Grade: null }],
            })),
          }
        : candidate,
    ),
  }
}

export function clearComponent(sheet: TeacherGrade, component: string): TeacherGrade {
  return mapGroups(sheet, (group) => ({
    ...group,
    Students: group.Students.map((student) => ({
      ...student,
      Grades: student.Grades.map((grade) => (grade.Component === component ? { ...grade, Grade: null } : grade)),
    })),
  }))
}

export interface PastedRow {
  roll: string
  value: string
}

/** Legacy FrmImport splits pasted rows on tabs/spaces and rejects duplicate rolls. */
export function parsePastedRows(text: string, skipFirstRow: boolean, expectValue: boolean): { rows: PastedRow[] } | { error: string } {
  const lines = text.split(/\r?\n/).slice(skipFirstRow ? 1 : 0).filter((line) => line.trim() !== '')
  if (!lines.length) return { error: 'Nothing to import.' }
  const rows: PastedRow[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    const parts = line.split(/[\t ]+/).filter((part) => part !== '')
    if (expectValue && parts.length !== 2) return { error: `Wrong format: ${line.trim()}` }
    const roll = parts[0].trim().toUpperCase()
    if (seen.has(roll)) return { error: `There is more than one row with roll “${roll}”.` }
    seen.add(roll)
    rows.push({ roll, value: expectValue ? parts[1].trim() : parts.slice(1).join(' ').trim() })
  }
  return { rows }
}

export interface ImportOutcome {
  sheet: TeacherGrade
  applied: number
  missing: string[]
}

export function applyPastedMarks(sheet: TeacherGrade, component: string, rows: PastedRow[]): ImportOutcome | { error: string } {
  for (const row of rows) {
    const parsed = parseMark(component, row.value)
    if ('error' in parsed) return { error: `${row.roll}: ${parsed.error}` }
  }
  const rolls = new Set(sheet.SubjectClassGrades.flatMap((group) => group.Students.map((student) => student.Roll.trim().toUpperCase())))
  let next = sheet
  let applied = 0
  const missing: string[] = []
  for (const row of rows) {
    if (!rolls.has(row.roll)) {
      missing.push(row.roll)
      continue
    }
    const parsed = parseMark(component, row.value) as { value: GradeValue }
    next = setStudentMark(next, findRoll(next, row.roll), component, parsed.value)
    applied += 1
  }
  return { sheet: next, applied, missing }
}

export function applyPastedComments(sheet: TeacherGrade, rows: PastedRow[]): ImportOutcome {
  const rolls = new Set(sheet.SubjectClassGrades.flatMap((group) => group.Students.map((student) => student.Roll.trim().toUpperCase())))
  let next = sheet
  let applied = 0
  const missing: string[] = []
  for (const row of rows) {
    if (!rolls.has(row.roll)) {
      missing.push(row.roll)
      continue
    }
    next = setStudentComment(next, findRoll(next, row.roll), row.value)
    applied += 1
  }
  return { sheet: next, applied, missing }
}

function findRoll(sheet: TeacherGrade, normalizedRoll: string) {
  for (const group of sheet.SubjectClassGrades) {
    const match = group.Students.find((student) => student.Roll.trim().toUpperCase() === normalizedRoll)
    if (match) return match.Roll
  }
  return normalizedRoll
}

export function setStudentMark(sheet: TeacherGrade, roll: string, component: string, value: GradeValue): TeacherGrade {
  return mapGroups(sheet, (group) =>
    mapStudent(group, roll, (student) => {
      const hasComponent = student.Grades.some((grade) => grade.Component === component)
      return {
        ...student,
        Grades: hasComponent
          ? student.Grades.map((grade) => (grade.Component === component ? { ...grade, Grade: value } : grade))
          : [...student.Grades, { Component: component, Grade: value }],
      }
    }),
  )
}
