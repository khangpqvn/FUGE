import type { DocumentKind, WorkflowDocument } from '../types/models'

const MAX_BINARY_BYTES = 8 * 1024 * 1024
const EXTENSION_KIND: Record<string, DocumentKind> = {
  '.cmt': 'thesis-comment',
  '.tef': 'defense-grading',
  '.master': 'final-thesis-grading-items',
}

export function configuredLegacyBridgeUrl() {
  return import.meta.env.VITE_LEGACY_BRIDGE_URL?.replace(/\/$/, '') ?? ''
}

export async function importLegacyBinary(file: File): Promise<WorkflowDocument> {
  const extension = extensionOf(file.name)
  const kind = EXTENSION_KIND[extension]
  if (!kind) throw new Error('Only .cmt, .tef, and .master binary files are supported by the legacy converter.')
  if (file.size === 0 || file.size > MAX_BINARY_BYTES) throw new Error('Legacy file must be between 1 byte and 8 MB.')
  const baseUrl = configuredLegacyBridgeUrl()
  if (!baseUrl) throw new Error('Legacy binary converter is not configured. Export or import canonical JSON, or configure VITE_LEGACY_BRIDGE_URL.')

  const form = new FormData()
  form.append('file', file, file.name)
  const response = await fetch(`${baseUrl}/api/legacy/import?kind=${kind}`, { method: 'POST', body: form })
  if (!response.ok) throw new Error(await readBridgeError(response))
  const result = await response.json() as unknown
  return validateBridgeDocument(result, kind, file.name)
}

export async function exportLegacyBinary(document: WorkflowDocument): Promise<Blob> {
  const extensionByKind: Partial<Record<DocumentKind, string>> = {
    'thesis-comment': '.cmt',
    'defense-grading': '.tef',
    'final-thesis-grading-items': '.master',
  }
  const extension = extensionByKind[document.kind]
  if (!extension) throw new Error('This workflow has no BinaryFormatter legacy export.')
  const baseUrl = configuredLegacyBridgeUrl()
  if (!baseUrl) throw new Error('Legacy binary converter is not configured; JSON export remains available.')

  const response = await fetch(`${baseUrl}/api/legacy/export?kind=${document.kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  if (!response.ok) throw new Error(await readBridgeError(response))
  const blob = await response.blob()
  if (!blob.size || blob.size > MAX_BINARY_BYTES) throw new Error('Converter returned an empty or oversized legacy file.')
  return blob
}

export function legacyExtensionForKind(kind: DocumentKind) {
  return Object.entries(EXTENSION_KIND).find(([, candidate]) => candidate === kind)?.[0] ?? '.fg'
}

function validateBridgeDocument(value: unknown, expectedKind: DocumentKind, fileName: string): WorkflowDocument {
  if (!isRecord(value) || value.format !== 'fugrade.canonical' || value.schemaVersion !== 1 || value.kind !== expectedKind || !isRecord(value.data)) {
    throw new Error('Legacy converter returned an invalid or mismatched document.')
  }
  return {
    ...value,
    metadata: {
      fileName,
      sourceFormat: legacyExtensionForKind(expectedKind).slice(1) as 'cmt' | 'tef' | 'master',
      importedAt: new Date().toISOString(),
      ...(isRecord(value.metadata) && typeof value.metadata.sourceLegacyType === 'string' ? { sourceLegacyType: value.metadata.sourceLegacyType } : {}),
    },
  } as WorkflowDocument
}

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase()
}

async function readBridgeError(response: Response) {
  try {
    const body = await response.json() as { message?: string }
    if (body.message) return body.message
  } catch {
    // Use a generic error when the converter did not return JSON.
  }
  return `Legacy converter failed with status ${response.status}.`
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
