import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decryptLegacyFg, encryptLegacyFg, readLegacyFg, requiresPassword, verifyMd5 } from './legacy-fg'
import type { TeacherGrade } from '../types/models'

const REAL_FG_FIXTURE = 'D:/Work/FUGE/old/FuGrade/MasterFile/khangpq3Summer2026.fg'

function fileFrom(path: string, name: string) {
  return new File([readFileSync(path)], name)
}

describe('md5 compatibility with legacy Helper.GetMd5Hash', () => {
  it('matches known RFC 1321 vectors', async () => {
    await expect(verifyMd5('', 'd41d8cd98f00b204e9800998ecf8427e')).resolves.toBe(true)
    await expect(verifyMd5('abc', '900150983cd24fb0d6963f7d28e17f72')).resolves.toBe(true)
    await expect(verifyMd5('message digest', 'f96b697d7cb7938d525a2f31aaf161d0')).resolves.toBe(true)
    await expect(verifyMd5('The quick brown fox jumps over the lazy dog', '9e107d9d372bb6826bd81d3542a419d6')).resolves.toBe(true)
  })

  it('is case-insensitive like StringComparer.OrdinalIgnoreCase', async () => {
    await expect(verifyMd5('abc', '900150983CD24FB0D6963F7D28E17F72')).resolves.toBe(true)
  })

  it('rejects a wrong password', async () => {
    await expect(verifyMd5('abcd', '900150983cd24fb0d6963f7d28e17f72')).resolves.toBe(false)
  })

  // A padding or block-index bug still passes the short vectors above but fails at the
  // 56/64-byte boundaries, which would silently lock a teacher out of their own file.
  // Compared against an independent MD5 so the expectation cannot drift.
  it('matches an independent MD5 across block boundaries and UTF-8 input', async () => {
    const lengths = [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 200, 1000]
    const inputs = [
      ...lengths.map((length) => 'x'.repeat(length)),
      'abc',
      'message digest',
      'Nguyễn Văn An — mật khẩu Tiếng Việt',
      `${String.fromCodePoint(0x1f510)}password`,
      'Chấm điểm luận văn tốt nghiệp '.repeat(7),
    ]
    for (const input of inputs) {
      const expected = createHash('md5').update(input, 'utf8').digest('hex')
      await expect(verifyMd5(input, expected)).resolves.toBe(true)
      await expect(verifyMd5(`${input}!`, expected)).resolves.toBe(false)
    }
  })
})

describe('.fg AES round trip', () => {
  const sheet: TeacherGrade = {
    Version: '1.1',
    Semester: 'Summer 2026',
    Login: 'teacher',
    Password: '',
    SubjectClassGrades: [
      {
        Subject: 'SEP490',
        Class: 'SE1732',
        Components: ['Status', 'Bảo vệ'],
        Students: [
          {
            Roll: 'HE000001',
            Name: 'Nguyễn Văn A',
            Comment: 'Ổn định',
            Grades: [
              { Component: 'Status', Grade: 1 },
              { Component: 'Bảo vệ', Grade: 8.5 },
            ],
          },
          {
            Roll: 'HE000002',
            Name: 'Trần Thị B',
            Comment: '',
            Grades: [
              { Component: 'Status', Grade: null },
              { Component: 'Bảo vệ', Grade: null },
            ],
          },
        ],
      },
    ],
  }

  it('preserves Unicode text, null grades and field names', async () => {
    const blob = await encryptLegacyFg(sheet)
    const reopened = await decryptLegacyFg(new File([await blob.arrayBuffer()], 'round-trip.fg'))
    expect(reopened).toEqual(sheet)
  })

  it('enforces the stored password hash', async () => {
    const protectedSheet: TeacherGrade = { ...sheet, Password: '900150983cd24fb0d6963f7d28e17f72' }
    const blob = await encryptLegacyFg(protectedSheet)
    const file = new File([await blob.arrayBuffer()], 'protected.fg')
    await expect(decryptLegacyFg(file, 'wrong')).rejects.toThrow(/password/i)
    await expect(decryptLegacyFg(file, 'abc')).resolves.toMatchObject({ Login: 'teacher' })
  })

  it('rejects a file that is not legacy ciphertext', async () => {
    await expect(decryptLegacyFg(new File(['not base64 ciphertext'], 'broken.fg'))).rejects.toThrow()
  })

  it('rejects ciphertext that does not decrypt to a TeacherGrade root', async () => {
    const blob = await encryptLegacyFg({ nonsense: true } as unknown as TeacherGrade)
    await expect(readLegacyFg(new File([await blob.arrayBuffer()], 'wrong-root.fg'))).rejects.toThrow(/TeacherGrade root/)
  })
})

describe('real legacy fixture', () => {
  const available = existsSync(REAL_FG_FIXTURE)

  it.skipIf(!available)('decrypts the real .fg produced by FuGrade and re-encrypts without data loss', async () => {
    const opened = await readLegacyFg(fileFrom(REAL_FG_FIXTURE, 'khangpq3Summer2026.fg'))
    expect(opened.SubjectClassGrades.length).toBeGreaterThan(0)
    expect(opened.Version).toMatch(/^\d+\.\d+$/)
    expect(opened.SubjectClassGrades[0].Students.length).toBeGreaterThan(0)

    const reexported = await encryptLegacyFg(opened)
    const reopened = await readLegacyFg(new File([await reexported.arrayBuffer()], 'again.fg'))
    expect(reopened).toEqual(opened)
  })

  it.skipIf(!available)('keeps the legacy password gate on the real fixture', async () => {
    const opened = await readLegacyFg(fileFrom(REAL_FG_FIXTURE, 'khangpq3Summer2026.fg'))
    if (!requiresPassword(opened)) {
      expect(opened.Password).toBe('')
      return
    }
    await expect(decryptLegacyFg(fileFrom(REAL_FG_FIXTURE, 'khangpq3Summer2026.fg'), 'definitely-not-the-password')).rejects.toThrow(
      /Incorrect password/,
    )
  })
})
