import type { DocumentKind, WorkflowDocument } from '../types/models'
import { exportLegacyBytes, importLegacyBytes } from './binary-formatter/legacy-codec'

const MAX_BINARY_BYTES = 8 * 1024 * 1024
const EXTENSION_KIND: Record<string, DocumentKind> = {
  '.cmt': 'thesis-comment',
  '.tef': 'defense-grading',
  '.master': 'final-thesis-grading-items',
}

export async function importLegacyBinary(file: File): Promise<WorkflowDocument> {
  const extension = extensionOf(file.name)
  const kind = EXTENSION_KIND[extension]
  if (!kind) throw new Error('Only .cmt, .tef, and .master binary files are supported by the legacy converter.')
  if (file.size === 0 || file.size > MAX_BINARY_BYTES) throw new Error('Legacy file must be between 1 byte and 8 MB.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const document = importLegacyBytes(bytes, kind)
  document.metadata.fileName = file.name
  document.metadata.sourceFormat = extension.slice(1) as 'cmt' | 'tef' | 'master'
  document.metadata.importedAt = new Date().toISOString()
  return document
}

export async function exportLegacyBinary(document: WorkflowDocument): Promise<Blob> {
  const extensionByKind: Partial<Record<DocumentKind, string>> = {
    'thesis-comment': '.cmt',
    'defense-grading': '.tef',
    'final-thesis-grading-items': '.master',
  }
  const extension = extensionByKind[document.kind]
  if (!extension) throw new Error('This workflow has no BinaryFormatter legacy export.')
  const bytes = exportLegacyBytes(document)
  if (!bytes.byteLength || bytes.byteLength > MAX_BINARY_BYTES) throw new Error('Legacy export is empty or oversized.')
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([copy], { type: 'application/octet-stream' })
}

export function legacyExtensionForKind(kind: DocumentKind) {
  return Object.entries(EXTENSION_KIND).find(([, candidate]) => candidate === kind)?.[0] ?? '.fg'
}

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase()
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
