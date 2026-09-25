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

const MAX_JSON_BYTES = 5 * 1024 * 1024

export function makeCanonicalDocument(
  kind: DocumentKind,
  data: TeacherGrade | ThesisComment | DefenseGrading | { items: FinalThesisGradingItem[] },
  fileName: string,
  sourceFormat: SourceFormat,
): WorkflowDocument {
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind,
    metadata: {
      fileName,
      sourceFormat,
      importedAt: new Date().toISOString(),
    },
    data,
  } as WorkflowDocument
}

export function parseCanonicalJson(text: string): WorkflowDocument {
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new Error('JSON document exceeds the 5 MB limit.')
  }

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('The JSON document is malformed.')
  }

  if (!isRecord(value) || value.format !== 'fugrade.canonical' || value.schemaVersion !== 1 || !isKnownKind(value.kind) || !isRecord(value.data)) {
    throw new Error('Unsupported canonical JSON envelope.')
  }

  if (!isRecord(value.metadata) || typeof value.metadata.fileName !== 'string' || typeof value.metadata.sourceFormat !== 'string') {
    throw new Error('Canonical JSON metadata is invalid.')
  }

  return value as WorkflowDocument
}

export function canonicalJsonBlob(document: WorkflowDocument) {
  return new Blob([JSON.stringify(document, null, 2)], { type: 'application/json;charset=utf-8' })
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isKnownKind(value: unknown): value is DocumentKind {
  return value === 'teacher-grade' || value === 'thesis-comment' || value === 'defense-grading' || value === 'final-thesis-grading-items'
}
