import type {
  CanonicalDocument,
  DefenseGrading,
  DocumentKind,
  FinalThesisGradingItem,
  SourceFormat,
  TeacherGrade,
  ThesisComment,
  WorkflowDocument,
} from '../types/models'
import { parseCanonicalJson } from './canonical-json'
import { validatePayload } from './document-validation'
import { readLegacyFg, requiresPassword, verifyMd5 } from './legacy-fg'
import { importLegacyBinary } from './legacy-codec'

const MAX_FILE_BYTES = 8 * 1024 * 1024

/** Raised when a document carries a legacy password hash and the caller supplied none. */
export class PasswordRequiredError extends Error {
  constructor() {
    super('This file is password protected. Enter its FuGrade password to continue.')
    this.name = 'PasswordRequiredError'
  }
}

export async function importWorkflowFile(file: File, password: string, allowReadOnly = false): Promise<WorkflowDocument> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('File must be between 1 byte and 8 MB.')
  const extension = extensionOf(file.name)
  let document: WorkflowDocument

  if (extension === '.fg') {
    const data = await readLegacyFg(file)
    if (requiresPassword(data) && !allowReadOnly) {
      if (!password) throw new PasswordRequiredError()
      if (!(await verifyMd5(password, data.Password))) throw new Error('Incorrect password for this grading file.')
    }
    document = wrap('teacher-grade', data, file.name, 'fg')
  } else if (extension === '.json') {
    document = parseCanonicalJson(await file.text())
    document.metadata.fileName = file.name
    document.metadata.sourceFormat = 'json'
  } else if (extension === '.cmt' || extension === '.tef' || extension === '.master') {
    document = await importLegacyBinary(file)
    const protectedHash = protectedPasswordHash(document)
    if (protectedHash && !allowReadOnly) {
      if (!password) throw new PasswordRequiredError()
      if (!(await verifyMd5(password, protectedHash))) throw new Error('Incorrect password for this grading file.')
    }
  } else {
    throw new Error('Unsupported file. Choose .fg, .cmt, .tef, .master, or canonical .json.')
  }

  const errors = validatePayload(document.kind, document.data)
  if (errors.length) throw new Error(`Document validation failed: ${errors.slice(0, 5).join(' ')}`)
  return document
}

function wrap(kind: DocumentKind, data: TeacherGrade | ThesisComment | DefenseGrading | { items: FinalThesisGradingItem[] }, fileName: string, sourceFormat: SourceFormat): WorkflowDocument {
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind,
    metadata: { fileName, sourceFormat, importedAt: new Date().toISOString() },
    data,
  } as WorkflowDocument
}

function protectedPasswordHash(document: WorkflowDocument) {
  if (document.kind === 'thesis-comment') return (document.data as ThesisComment).Password.trim()
  if (document.kind === 'defense-grading') return (document.data as DefenseGrading).Password.trim()
  return ''
}

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase()
}
