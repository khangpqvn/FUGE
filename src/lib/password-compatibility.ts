import { hashLegacyPassword, verifyMd5 } from './legacy-fg'

export function validatePasswordPair(password: string, confirmation: string) {
  if (!password.trim()) return { error: 'Password cannot be empty.' } as const
  if (password !== confirmation) return { error: 'The passwords entered do not match.' } as const
  return { hash: hashLegacyPassword(password) } as const
}

export async function verifyLegacyPassword(password: string, expectedHash: string) {
  if (!password.trim() || !expectedHash.trim()) return false
  return verifyMd5(password, expectedHash)
}
