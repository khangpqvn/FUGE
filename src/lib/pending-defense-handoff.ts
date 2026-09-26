import type { CanonicalDocument, DefenseGrading } from '../types/models'
import { validatePayload } from './document-validation'

const STORAGE_PREFIX = 'fugrade.pending-defense.'

/**
 * Hands a freshly built defense sheet to a new browser tab. The app keeps its document in React
 * state, so a new tab starts empty; the sheet is parked in localStorage under a per-click key and
 * the tab reads it back by that key. A key per click keeps two quick openings from overwriting
 * each other.
 *
 * Call this synchronously from a click handler: an await would move window.open out of the user
 * gesture and invite the popup blocker.
 *
 * Returns false when the tab was blocked, so the caller can fall back to the current tab. The
 * opener is severed by hand rather than with the `noopener` window feature, because window.open
 * returns null whenever `noopener` is set — which would make every open look like a block.
 */
export function openDefenseInNewTab(document: CanonicalDocument<DefenseGrading>): boolean {
  const handoffId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const url = new URL(window.location.href)
  url.searchParams.set('defense', handoffId)

  localStorage.setItem(STORAGE_PREFIX + handoffId, JSON.stringify(document))
  const opened = window.open(url.toString(), '_blank')
  if (!opened) {
    localStorage.removeItem(STORAGE_PREFIX + handoffId)
    return false
  }
  opened.opener = null
  return true
}

/** Reads and clears the sheet the new tab was opened for, or null when there is none. */
export function takePendingDefense(): CanonicalDocument<DefenseGrading> | null {
  const handoffId = new URLSearchParams(window.location.search).get('defense')
  if (!handoffId) return null

  const stored = localStorage.getItem(STORAGE_PREFIX + handoffId)
  localStorage.removeItem(STORAGE_PREFIX + handoffId)

  const url = new URL(window.location.href)
  url.searchParams.delete('defense')
  window.history.replaceState(null, '', url)

  if (!stored) return null
  try {
    const parsed = JSON.parse(stored) as CanonicalDocument<DefenseGrading>
    if (parsed?.kind !== 'defense-grading') return null
    const problems = validatePayload(parsed.kind, parsed.data)
    return problems.length ? null : parsed
  } catch {
    return null
  }
}
