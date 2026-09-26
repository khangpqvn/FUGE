import { describe, expect, it } from 'vitest'
import { groupSelectedFiles, summarizeSelectedFiles } from './summary-workflow'
import { canonicalJsonBlob } from './canonical-json'
import type { CanonicalDocument, DefenseGrading } from '../types/models'

function createDefenseDoc(className: string, rolls: string[], teacher: string, mark: number): CanonicalDocument<DefenseGrading> {
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind: 'defense-grading',
    metadata: { fileName: `${teacher}_${className}.json`, sourceFormat: 'json', importedAt: new Date().toISOString() },
    data: {
      SubjectCode: 'SEP490',
      TitleVN: 'Đề tài ' + className,
      TitleEN: 'Thesis ' + className,
      Supervisor: 'supervisor',
      ClassName: className,
      Semester: 'Summer2026',
      GroupMark: 0,
      GradedTime: '2026-08-28T00:00:00.000Z',
      GradedTeacher: teacher,
      SupervisorComment: null,
      Password: '',
      Note: '',
      GradeStudents: rolls.map((roll) => ({
        Roll: roll,
        Name: 'Student ' + roll,
        Conclusion: 'Agree to defense',
        GradedItems: [{ GroupItem: null, ItemName: 'Criterion', Scale: 10, GroupMark: 0, Mark: mark }],
      })),
    },
  }
}

function docToFile(doc: CanonicalDocument<DefenseGrading>, path: string): File {
  const blob = canonicalJsonBlob(doc)
  const file = new File([blob], doc.metadata.fileName, { type: 'application/json' })
  Object.defineProperty(file, 'webkitRelativePath', { value: path, writable: false })
  return file
}

describe('summary-workflow', () => {
  it('groups files by folder when relative paths have folder parts', () => {
    const file1 = docToFile(createDefenseDoc('G1', ['HE1'], 'Alice', 8), 'Root/Group1/Alice_G1.json')
    const file2 = docToFile(createDefenseDoc('G1', ['HE1'], 'Bob', 9), 'Root/Group1/Bob_G1.json')
    const file3 = docToFile(createDefenseDoc('G2', ['HE2'], 'Carol', 7), 'Root/Group2/Carol_G2.json')

    const groups = groupSelectedFiles([file1, file2, file3])
    expect(Array.from(groups.keys())).toEqual(['Group1', 'Group2'])
    expect(groups.get('Group1')?.length).toBe(2)
    expect(groups.get('Group2')?.length).toBe(1)
  })

  it('summarizes multiple groups across folders', async () => {
    const file1 = docToFile(createDefenseDoc('G1', ['HE1'], 'Alice', 8), 'Root/Group1/Alice_G1.json')
    const file2 = docToFile(createDefenseDoc('G1', ['HE1'], 'Bob', 9), 'Root/Group1/Bob_G1.json')
    const file3 = docToFile(createDefenseDoc('G2', ['HE2'], 'Carol', 7), 'Root/Group2/Carol_G2.json')

    const summary = await summarizeSelectedFiles([file1, file2, file3])
    expect(summary.groups).toBe(2)
    expect(summary.students).toBe(2)
    expect(summary.grades).toHaveLength(2)
    expect(summary.teachers).toHaveLength(3)

    const g1 = summary.grades.find((g) => g.Roll === 'HE1')
    expect(g1?.AvgMark).toBe(8.5)
    expect(g1?.ListFGOT).toHaveLength(2)

    const g2 = summary.grades.find((g) => g.Roll === 'HE2')
    expect(g2?.AvgMark).toBe(7)
  })

  it('summarizes flat multiple files by partition signatures', async () => {
    const file1 = docToFile(createDefenseDoc('G1', ['HE1'], 'Alice', 8), 'Alice_G1.json')
    const file2 = docToFile(createDefenseDoc('G1', ['HE1'], 'Bob', 9), 'Bob_G1.json')
    const file3 = docToFile(createDefenseDoc('G2', ['HE2'], 'Carol', 7), 'Carol_G2.json')

    const summary = await summarizeSelectedFiles([file1, file2, file3])
    expect(summary.groups).toBe(2)
    expect(summary.students).toBe(2)
  })
})
