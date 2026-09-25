import { describe, expect, it } from 'vitest'
import { canonicalJsonBlob, makeCanonicalDocument, parseCanonicalJson } from './canonical-json'
import { PasswordRequiredError, importWorkflowFile } from './file-import'
import { encryptLegacyFg } from './legacy-fg'
import { legacyExtensionForKind } from './legacy-bridge'
import type { TeacherGrade, WorkflowDocument } from '../types/models'

const sheet: TeacherGrade = {
  Version: '1.1',
  Semester: 'Summer 2026',
  Login: 'teacher',
  Password: '',
  SubjectClassGrades: [
    {
      Subject: 'SEP490',
      Class: 'SE1732',
      Components: ['Presentation'],
      Students: [{ Roll: 'HE1', Name: 'A', Comment: '', Grades: [{ Component: 'Presentation', Grade: 8 }] }],
    },
  ],
}

async function fgFile(data: TeacherGrade, name = 'sheet.fg') {
  const blob = await encryptLegacyFg(data)
  return new File([await blob.arrayBuffer()], name)
}

describe('canonical JSON envelope', () => {
  it('round-trips a document through export and import', async () => {
    const document = makeCanonicalDocument('teacher-grade', sheet, 'sheet.fg', 'fg')
    const text = await canonicalJsonBlob(document).text()
    expect(parseCanonicalJson(text)).toEqual(document)
  })

  it('rejects malformed JSON', () => {
    expect(() => parseCanonicalJson('{ not json')).toThrow(/malformed/i)
  })

  it('rejects a foreign or unversioned envelope', () => {
    expect(() => parseCanonicalJson(JSON.stringify({ format: 'something-else', schemaVersion: 1, kind: 'teacher-grade', data: {}, metadata: {} }))).toThrow()
    expect(() =>
      parseCanonicalJson(JSON.stringify({ format: 'fugrade.canonical', schemaVersion: 2, kind: 'teacher-grade', data: {}, metadata: {} })),
    ).toThrow()
  })

  it('rejects an unknown document kind', () => {
    const payload = JSON.stringify({
      format: 'fugrade.canonical',
      schemaVersion: 1,
      kind: 'something-new',
      metadata: { fileName: 'x.json', sourceFormat: 'json', importedAt: '2026-09-21T00:00:00.000Z' },
      data: {},
    })
    expect(() => parseCanonicalJson(payload)).toThrow(/Unsupported canonical JSON envelope/)
  })
})

describe('importWorkflowFile', () => {
  it('imports a .fg grading sheet', async () => {
    const document = await importWorkflowFile(await fgFile(sheet), '')
    expect(document.kind).toBe('teacher-grade')
    expect(document.metadata.sourceFormat).toBe('fg')
    expect(document.data).toEqual(sheet)
  })

  it('asks for a password only when the file carries a hash', async () => {
    const guarded = { ...sheet, Password: '900150983cd24fb0d6963f7d28e17f72' }
    await expect(importWorkflowFile(await fgFile(guarded, 'guarded.fg'), '')).rejects.toBeInstanceOf(PasswordRequiredError)
    await expect(importWorkflowFile(await fgFile(guarded, 'guarded.fg'), 'nope')).rejects.toThrow(/Incorrect password/)
    await expect(importWorkflowFile(await fgFile(guarded, 'guarded.fg'), 'abc')).resolves.toMatchObject({ kind: 'teacher-grade' })
  })

  it('imports a canonical JSON document and records the json source', async () => {
    const document = makeCanonicalDocument('teacher-grade', sheet, 'sheet.fg', 'fg') as WorkflowDocument
    const file = new File([await canonicalJsonBlob(document).text()], 'sheet.fuge.json')
    const reopened = await importWorkflowFile(file, '')
    expect(reopened.metadata.sourceFormat).toBe('json')
    expect(reopened.data).toEqual(sheet)
  })

  it('rejects a document whose payload breaks legacy validation', async () => {
    const broken = makeCanonicalDocument('teacher-grade', { ...sheet, SubjectClassGrades: [{ ...sheet.SubjectClassGrades[0], Students: [{ Roll: 'HE1', Name: 'A', Comment: '', Grades: [{ Component: 'Presentation', Grade: 42 }] }] }] }, 'bad.fg', 'fg')
    const file = new File([await canonicalJsonBlob(broken as WorkflowDocument).text()], 'bad.fuge.json')
    await expect(importWorkflowFile(file, '')).rejects.toThrow(/validation failed/i)
  })

  it('rejects an unsupported extension', async () => {
    await expect(importWorkflowFile(new File(['x'], 'notes.txt'), '')).rejects.toThrow(/Unsupported file/)
  })

  it('rejects an empty file', async () => {
    await expect(importWorkflowFile(new File([], 'empty.fg'), '')).rejects.toThrow(/between 1 byte/)
  })

  it('reports that the converter is required for BinaryFormatter formats', async () => {
    for (const name of ['group.cmt', 'form.tef', 'FinalThesisGradingItems.master']) {
      await expect(importWorkflowFile(new File([new Uint8Array([0, 1, 0, 0, 0])], name), '')).rejects.toThrow(/converter is not configured/i)
    }
  })
})

describe('legacy extension mapping', () => {
  it('maps each binary workflow to its legacy extension', () => {
    expect(legacyExtensionForKind('thesis-comment')).toBe('.cmt')
    expect(legacyExtensionForKind('defense-grading')).toBe('.tef')
    expect(legacyExtensionForKind('final-thesis-grading-items')).toBe('.master')
    expect(legacyExtensionForKind('teacher-grade')).toBe('.fg')
  })
})
