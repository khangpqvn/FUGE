import type { DefenseGrading, SummaryResult } from '../types/models'
import { importWorkflowFile } from './file-import'
import { summarizeDefenseGroup } from './final-grade'

export interface SummaryFileStatus {
  name: string
  group: string
  status: 'loaded' | 'failed'
  message?: string
}

export interface SummaryWorkflowResult extends SummaryResult {
  files: SummaryFileStatus[]
}

export function groupSelectedFiles(files: File[]) {
  const groups = new Map<string, File[]>()
  files.forEach((file) => {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    const parts = relative.split(/[\\/]/).filter(Boolean)
    const group = parts.length >= 2 ? parts[parts.length - 2] : 'Selected files'
    const current = groups.get(group) ?? []
    current.push(file)
    groups.set(group, current)
  })
  return groups
}

export async function summarizeSelectedFiles(files: File[]): Promise<SummaryWorkflowResult> {
  const statuses: SummaryFileStatus[] = []
  const grades: SummaryResult['grades'] = []
  const teachers: SummaryResult['teachers'] = []
  let groups = 0
  let students = 0

  for (const [group, candidates] of groupSelectedFiles(files)) {
    const loadedDefenses: Array<{ defense: DefenseGrading; file: File }> = []
    for (const file of candidates) {
      try {
        const document = await importWorkflowFile(file, '', true)
        if (document.kind !== 'defense-grading') throw new Error('File is not a defense evaluation.')
        loadedDefenses.push({ defense: document.data as DefenseGrading, file })
        statuses.push({ name: file.name, group, status: 'loaded' })
      } catch (cause) {
        statuses.push({ name: file.name, group, status: 'failed', message: cause instanceof Error ? cause.message : 'Could not read file.' })
      }
    }
    if (!loadedDefenses.length) continue

    const buckets: Array<{ bucketName: string; defenses: DefenseGrading[]; files: File[] }> = []
    if (group === 'Selected files') {
      const sigMap = new Map<string, { defenses: DefenseGrading[]; files: File[] }>()
      for (const item of loadedDefenses) {
        const sig = `${item.defense.Semester}-${item.defense.SubjectCode}-${item.defense.ClassName}-${item.defense.GradeStudents.map((s) => s.Roll).join('-')}`
        const existing = sigMap.get(sig) ?? { defenses: [], files: [] }
        existing.defenses.push(item.defense)
        existing.files.push(item.file)
        sigMap.set(sig, existing)
      }
      for (const [sig, bucket] of sigMap.entries()) {
        buckets.push({ bucketName: bucket.defenses[0]?.ClassName || sig, defenses: bucket.defenses, files: bucket.files })
      }
    } else {
      buckets.push({ bucketName: group, defenses: loadedDefenses.map((d) => d.defense), files: loadedDefenses.map((d) => d.file) })
    }

    for (const bucket of buckets) {
      const result = summarizeDefenseGroup(bucket.defenses)
      if ('error' in result) {
        statuses.filter((status) => bucket.files.some((f) => f.name === status.name && status.group === group)).forEach((status) => {
          status.status = 'failed'
          status.message = result.error
        })
        continue
      }
      groups += result.groups
      students += result.students
      grades.push(...result.grades)
      teachers.push(...result.teachers)
    }
  }

  if (!grades.length && statuses.some((status) => status.status === 'failed')) {
    throw new Error(statuses.find((status) => status.status === 'failed')?.message || 'No valid defense evaluation files found.')
  }
  return { grades, teachers, groups, students, files: statuses }
}
