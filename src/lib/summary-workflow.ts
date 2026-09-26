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
    const group = parts.length > 2 ? parts[parts.length - 2] : 'Selected files'
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
    const defenses: DefenseGrading[] = []
    for (const file of candidates) {
      try {
        const document = await importWorkflowFile(file, '')
        if (document.kind !== 'defense-grading') throw new Error('File is not a defense evaluation.')
        defenses.push(document.data as DefenseGrading)
        statuses.push({ name: file.name, group, status: 'loaded' })
      } catch (cause) {
        statuses.push({ name: file.name, group, status: 'failed', message: cause instanceof Error ? cause.message : 'Could not read file.' })
      }
    }
    if (!defenses.length) continue
    const result = summarizeDefenseGroup(defenses)
    if ('error' in result) {
      statuses.filter((status) => status.group === group && status.status === 'loaded').forEach((status) => {
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
  if (!grades.length && statuses.some((status) => status.status === 'failed')) {
    throw new Error(statuses.find((status) => status.status === 'failed')?.message || 'No valid defense evaluation files found.')
  }
  return { grades, teachers, groups, students, files: statuses }
}
