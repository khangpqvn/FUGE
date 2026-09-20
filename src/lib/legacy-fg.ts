import type { TeacherGrade } from '../types/models'

const LEGACY_KEY = new TextEncoder().encode('l10ca968o8e4133tyne2ea2315g19377')
const ZERO_IV = new Uint8Array(16)

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value.trim())
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function normalizeTeacherGrade(value: unknown): TeacherGrade {
  const source = value as Partial<TeacherGrade>
  return {
    Version: source.Version ?? '1.1',
    Semester: source.Semester ?? '',
    Login: source.Login ?? '',
    Password: source.Password ?? '',
    SubjectClassGrades: (source.SubjectClassGrades ?? []).map((group) => ({
      Subject: group.Subject ?? '',
      Class: group.Class ?? '',
      Components: [...(group.Components ?? [])],
      Students: (group.Students ?? []).map((student) => ({
        Roll: student.Roll ?? '',
        Name: student.Name ?? '',
        Comment: student.Comment ?? '',
        Grades: (student.Grades ?? []).map((grade) => ({
          Component: grade.Component ?? '',
          Grade: grade.Grade ?? null,
        })),
      })),
    })),
  }
}

export async function decryptLegacyFg(file: File, password = ''): Promise<TeacherGrade> {
  const encrypted = await crypto.subtle.importKey('raw', LEGACY_KEY, { name: 'AES-CBC' }, false, ['decrypt'])
  const cipherText = base64ToBytes(await file.text())
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ZERO_IV }, encrypted, cipherText)
  const parsed = JSON.parse(new TextDecoder().decode(plainBuffer)) as TeacherGrade
  const data = normalizeTeacherGrade(parsed)

  if (data.Password && !(await verifyMd5(password, data.Password))) {
    throw new Error('Incorrect password for this grading file.')
  }
  return data
}

export async function encryptLegacyFg(data: TeacherGrade): Promise<Blob> {
  const key = await crypto.subtle.importKey('raw', LEGACY_KEY, { name: 'AES-CBC' }, false, ['encrypt'])
  const plainText = new TextEncoder().encode(JSON.stringify(data))
  const cipherText = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ZERO_IV }, key, plainText)
  return new Blob([bytesToBase64(new Uint8Array(cipherText))], { type: 'text/plain;charset=utf-8' })
}

function md5(input: string) {
  const bytes = new TextEncoder().encode(input)
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 1) words[index >> 2] = (words[index >> 2] || 0) | (bytes[index] << ((index % 4) * 8))
  words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | (0x80 << ((bytes.length % 4) * 8))
  const bitLength = bytes.length * 8
  const paddedLength = (((bytes.length + 8) >> 6) + 1) * 16
  words[paddedLength - 2] = bitLength
  words[paddedLength - 1] = Math.floor(bitLength / 0x100000000)

  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476
  const rotate = (value: number, amount: number) => (value << amount) | (value >>> (32 - amount))
  const add = (x: number, y: number) => (x + y) | 0
  const k = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000))
  const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]

  for (let offset = 0; offset < paddedLength; offset += 16) {
    let aa = a; let bb = b; let cc = c; let dd = d
    for (let index = 0; index < 64; index += 1) {
      let functionValue: number; let wordIndex: number
      if (index < 16) { functionValue = (bb & cc) | (~bb & dd); wordIndex = index }
      else if (index < 32) { functionValue = (dd & bb) | (~dd & cc); wordIndex = (5 * index + 1) % 16 }
      else if (index < 48) { functionValue = bb ^ cc ^ dd; wordIndex = (3 * index + 5) % 16 }
      else { functionValue = cc ^ (bb | ~dd); wordIndex = (7 * index) % 16 }
      const shift = shifts[(index % 4) + (index < 16 ? 0 : index < 32 ? 4 : index < 48 ? 8 : 12)]
      const next = add(add(add(aa, functionValue), words[offset + wordIndex] || 0), k[index])
      aa = dd; dd = cc; cc = bb; bb = add(bb, rotate(next, shift))
    }
    a = add(a, aa); b = add(b, bb); c = add(c, cc); d = add(d, dd)
  }

  return [a, b, c, d].flatMap((value) => [0, 8, 16, 24].map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0'))).join('')
}

export async function verifyMd5(value: string, expected: string) {
  return md5(value).toLowerCase() === expected.toLowerCase()
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
