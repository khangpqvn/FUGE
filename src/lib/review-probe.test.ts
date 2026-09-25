import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { readLegacyFg } from './legacy-fg'
import { clearComponent, applyPastedMarks, setStudentMark, groupLabel } from './grading-edits'

const FIXTURE = 'D:/Work/FUGE/old/FuGrade/MasterFile/khangpq3Summer2026.fg'

async function open() {
  return readLegacyFg(new File([readFileSync(FIXTURE)], 'f.fg'))
}

describe('REVIEW blast radius on real teacher data', () => {
  it('duplicate rolls across classes', async () => {
    const sheet = await open()
    const seen = new Map<string, string[]>()
    for (const g of sheet.SubjectClassGrades) {
      for (const s of g.Students) {
        const key = s.Roll.trim().toUpperCase()
        seen.set(key, [...(seen.get(key) ?? []), groupLabel(g)])
      }
    }
    const dupes = [...seen.entries()].filter(([, groups]) => groups.length > 1)
    console.log('rolls appearing in more than one class:', dupes.length)
    console.log(dupes.slice(0, 6))
  })

  it('a single clear-component click reaches every class sharing that name', async () => {
    const sheet = await open()
    const countMarks = (s: typeof sheet, component: string) =>
      s.SubjectClassGrades.map((g) => ({
        group: groupLabel(g),
        nonNull: g.Students.reduce((n, st) => n + st.Grades.filter((gr) => gr.Component === component && gr.Grade != null).length, 0),
      })).filter((r) => r.nonNull > 0)

    for (const component of ['Status', 'LAB', 'Assignment']) {
      const before = countMarks(sheet, component)
      const after = countMarks(clearComponent(sheet, component), component)
      console.log(`clear "${component}" -> before`, before, 'after', after)
    }
  })

  it('paste import and single-cell writes hit duplicate rolls in other classes', async () => {
    const sheet = await open()
    const seen = new Map<string, string[]>()
    for (const g of sheet.SubjectClassGrades) for (const s of g.Students) {
      const k = s.Roll.trim().toUpperCase()
      seen.set(k, [...(seen.get(k) ?? []), groupLabel(g)])
    }
    const dupe = [...seen.entries()].find(([, gs]) => gs.length > 1)
    if (!dupe) { console.log('no duplicate roll in this fixture'); return }
    const [roll, groups] = dupe
    console.log('probe roll', roll, 'in', groups)
    const next = setStudentMark(sheet, roll, 'Status', 1)
    for (const g of next.SubjectClassGrades) {
      const s = g.Students.find((x) => x.Roll.trim().toUpperCase() === roll)
      if (s) console.log(' ', groupLabel(g), JSON.stringify(s.Grades.filter((gr) => gr.Component === 'Status')))
    }
    const outcome = applyPastedMarks(sheet, 'Status', [{ roll, value: '0' }])
    if ('error' in outcome) throw new Error(outcome.error)
    console.log('paste applied count (legacy would report per displayed class):', outcome.applied)
  })
})
