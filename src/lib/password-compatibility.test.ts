import { describe, expect, it } from 'vitest'
import { validatePasswordPair } from './password-compatibility'

describe('legacy password compatibility', () => {
  it('requires a non-empty matching pair and returns only a hash', () => {
    expect(validatePasswordPair('', '')).toEqual({ error: 'Password cannot be empty.' })
    expect(validatePasswordPair('one', 'two')).toEqual({ error: 'The passwords entered do not match.' })
    const result = validatePasswordPair('secret', 'secret')
    expect('hash' in result).toBe(true)
    if ('hash' in result) expect(result.hash).toMatch(/^[a-f0-9]{32}$/)
  })
})
