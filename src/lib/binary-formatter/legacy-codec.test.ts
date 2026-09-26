import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { exportLegacyBytes, importLegacyBytes } from './legacy-codec'

const fixtureRoot = 'D:/Work/FUGE/old/FuGrade/MasterFile'
const fixture = (name: string) => `${fixtureRoot}/${name}`

describe('legacy BinaryFormatter codec', () => {
  it('decodes the real thesis comment fixture when legacy samples are available', () => {
    const path = fixture('SEP490_SEP490_G5_huectm.cmt')
    if (!existsSync(path)) return
    const document = importLegacyBytes(new Uint8Array(readFileSync(path)), 'thesis-comment')
    expect(document.kind).toBe('thesis-comment')
    if (document.kind !== 'thesis-comment') throw new Error('Unexpected document kind')
    const comment = document.data as import('../../types/models').ThesisComment
    expect(comment.Teacher).toBe('huectm')
    expect(comment.Conclusion).toHaveLength(5)
  })

  it('decodes both real defense fixtures when legacy samples are available', () => {
    for (const name of ['khangpq_SEP490_CHẤM BẢO VỆ_HE173247_2026828_viht7.tef', 'khangpq_SEP490_CHẤM NGUỘI_HE173247_2026828_viht7.tef']) {
      const path = fixture(name)
      if (!existsSync(path)) continue
      const document = importLegacyBytes(new Uint8Array(readFileSync(path)), 'defense-grading')
      expect(document.kind).toBe('defense-grading')
      if (document.kind !== 'defense-grading') throw new Error('Unexpected document kind')
      const defense = document.data as import('../../types/models').DefenseGrading
      expect(defense.GradeStudents.length).toBeGreaterThan(0)
    }
  })

  it('decodes the real thesis comment fixture even if globalThis.Buffer was undefined (browser simulation)', () => {
    const path = fixture('SEP490_SEP490_G5_huectm.cmt')
    if (!existsSync(path)) return

    // Simulate browser environment without global Buffer
    delete (globalThis as Record<string, unknown>).Buffer

    const document = importLegacyBytes(new Uint8Array(readFileSync(path)), 'thesis-comment')
    expect(document.kind).toBe('thesis-comment')
    if (document.kind !== 'thesis-comment') throw new Error('Unexpected document kind')
    const comment = document.data as import('../../types/models').ThesisComment
    expect(comment.Teacher).toBe('huectm')
    expect(comment.Conclusion).toHaveLength(5)
  })

  it('decodes the real criteria metadata fixture when available', () => {
    const path = fixture('FinalThesisGradingItems.master')
    if (!existsSync(path)) return
    const document = importLegacyBytes(new Uint8Array(readFileSync(path)), 'final-thesis-grading-items')
    expect(document.kind).toBe('final-thesis-grading-items')
    if (document.kind !== 'final-thesis-grading-items') throw new Error('Unexpected document kind')
    const criteria = document.data as { items: import('../../types/models').FinalThesisGradingItem[] }
    expect(criteria.items.length).toBeGreaterThan(0)
  })

  it('round-trips the thesis comment fixture through exportLegacyBytes and importLegacyBytes', () => {
    const path = fixture('SEP490_SEP490_G5_huectm.cmt')
    if (!existsSync(path)) return
    const original = importLegacyBytes(new Uint8Array(readFileSync(path)), 'thesis-comment')
    const exportedBytes = exportLegacyBytes(original)
    const reimported = importLegacyBytes(exportedBytes, 'thesis-comment')
    expect(reimported.data).toEqual(original.data)
  })

  it('round-trips the defense grading fixture through exportLegacyBytes and importLegacyBytes', () => {
    const path = fixture('khangpq_SEP490_CHẤM BẢO VỆ_HE173247_2026828_viht7.tef')
    if (!existsSync(path)) return
    const original = importLegacyBytes(new Uint8Array(readFileSync(path)), 'defense-grading')
    const exportedBytes = exportLegacyBytes(original)
    const reimported = importLegacyBytes(exportedBytes, 'defense-grading')
    expect(reimported.data).toEqual(original.data)
  })

  it('round-trips the master criteria fixture through exportLegacyBytes and importLegacyBytes', () => {
    const path = fixture('FinalThesisGradingItems.master')
    if (!existsSync(path)) return
    const original = importLegacyBytes(new Uint8Array(readFileSync(path)), 'final-thesis-grading-items')
    const exportedBytes = exportLegacyBytes(original)
    const reimported = importLegacyBytes(exportedBytes, 'final-thesis-grading-items')
    expect(reimported.data).toEqual(original.data)
  })
})
