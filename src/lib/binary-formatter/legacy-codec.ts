import { Buffer } from 'buffer'
import { deserialize, serialize } from 'ms-nrbf-js'
import type { NrbfObject, NrbfValue } from 'ms-nrbf-js'
import type {
  DefenseGrading,
  DefenseStudentGrade,
  DocumentKind,
  FinalThesisGradingItem,
  GradedItem,
  ThesisComment,
  ThesisStudent,
  WorkflowDocument,
} from '../../types/models'
import { BinaryFormatterError } from './reader'
import { LEGACY_ASSEMBLY } from './schemas'

// Ensure global Buffer exists for ms-nrbf-js in browser environments
function ensureGlobalBuffer() {
  if (typeof globalThis !== 'undefined' && !(globalThis as unknown as { Buffer?: typeof Buffer }).Buffer) {
    ;(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
  }
  if (typeof window !== 'undefined' && !(window as unknown as { Buffer?: typeof Buffer }).Buffer) {
    ;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
  }
}

ensureGlobalBuffer()

const FU_GRADE_LIST_PREFIX = 'System.Collections.Generic.List`1[['

export function importLegacyBytes(bytes: Uint8Array, kind: DocumentKind): WorkflowDocument {
  if (kind === 'teacher-grade') throw new BinaryFormatterError('Teacher grade files use the AES `.fg` codec.')
  ensureGlobalBuffer()
  let root: unknown
  try {
    root = deserialize(Buffer.from(bytes))
  } catch (cause) {
    throw new BinaryFormatterError(cause instanceof Error ? cause.message : 'Could not decode the legacy binary file.')
  }
  if (!isNrbfObject(root)) throw new BinaryFormatterError('Legacy file does not contain an object root.')
  const data = kind === 'thesis-comment'
    ? decodeThesisComment(root)
    : kind === 'defense-grading'
      ? decodeDefenseGrading(root)
      : decodeCriteria(root)
  return {
    format: 'fugrade.canonical',
    schemaVersion: 1,
    kind,
    metadata: { fileName: 'legacy', sourceFormat: kind === 'thesis-comment' ? 'cmt' : kind === 'defense-grading' ? 'tef' : 'master', importedAt: new Date().toISOString(), sourceLegacyType: root.typeName },
    data,
  } as WorkflowDocument
}

export function exportLegacyBytes(document: WorkflowDocument): Uint8Array {
  ensureGlobalBuffer()
  try {
    const root = document.kind === 'thesis-comment'
      ? encodeThesisComment(document.data as ThesisComment)
      : document.kind === 'defense-grading'
        ? encodeDefenseGrading(document.data as DefenseGrading)
        : encodeCriteria((document.data as { items: FinalThesisGradingItem[] }).items)
    return new Uint8Array(serialize(root))
  } catch (cause) {
    throw new BinaryFormatterError(cause instanceof Error ? cause.message : 'Could not encode the legacy binary file.')
  }
}

function decodeThesisComment(root: NrbfObject): ThesisComment {
  requireType(root, 'FuGrade.ThesisComment')
  const members = root.members
  return {
    Teacher: text(members, '<Teacher>k__BackingField'), DT: dateText(members, '<DT>k__BackingField'), SubjectCode: text(members, '<SubjectCode>k__BackingField'), ClassName: nullableText(members, '<ClassName>k__BackingField') ?? '', Semester: nullableText(members, '<Semester>k__BackingField') ?? '', Password: nullableText(members, '<Password>k__BackingField') ?? '', TitleVN: text(members, '<TitleVN>k__BackingField'), TitleEN: text(members, '<TitleEN>k__BackingField'), Content: text(members, '<Content>k__BackingField'), Form: text(members, '<Form>k__BackingField'), Attitude: text(members, '<Attitude>k__BackingField'), Achievement: text(members, '<Achievement>k__BackingField'), Limitation: text(members, '<Limitation>k__BackingField'), Conclusion: decodeList(members['<Conclusion>k__BackingField'], decodeThesisStudent),
  }
}

function decodeThesisStudent(value: NrbfValue): ThesisStudent {
  const object = asObject(value, 'FuGrade.ThesisStudent')
  return { Roll: text(object.members, '<Roll>k__BackingField'), Name: text(object.members, '<Name>k__BackingField'), Agree_to_defense: nullableText(object.members, '<Agree_to_defense>k__BackingField'), Revised_for_the_second_defense: nullableText(object.members, '<Revised_for_the_second_defense>k__BackingField'), Disagree_to_defense: nullableText(object.members, '<Disagree_to_defense>k__BackingField'), Note: nullableText(object.members, '<Note>k__BackingField') ?? '' }
}

function decodeDefenseGrading(root: NrbfObject): DefenseGrading {
  requireType(root, 'FuGrade.DefenseGrading')
  const members = root.members
  return { SubjectCode: text(members, '<SubjectCode>k__BackingField'), TitleVN: text(members, '<TitleVN>k__BackingField'), TitleEN: text(members, '<TitleEN>k__BackingField'), Supervisor: text(members, '<Supervisor>k__BackingField'), ClassName: text(members, '<ClassName>k__BackingField'), Semester: text(members, '<Semester>k__BackingField'), GroupMark: numberValue(members['<GroupMark>k__BackingField']), GradedTime: dateText(members, '<GradedTime>k__BackingField'), GradedTeacher: text(members, '<GradedTeacher>k__BackingField'), SupervisorComment: members['<SupervisorComment>k__BackingField'] == null ? null : decodeThesisComment(asObject(members['<SupervisorComment>k__BackingField'], 'FuGrade.ThesisComment')), Password: nullableText(members, '<Password>k__BackingField') ?? '', Note: nullableText(members, '<Note>k__BackingField') ?? '', GradeStudents: decodeList(members['<GradeStudents>k__BackingField'], decodeDefenseStudent), }
}

function decodeDefenseStudent(value: NrbfValue): DefenseStudentGrade {
  const object = asObject(value, 'FuGrade.DefenseStudentGrade')
  return { Roll: text(object.members, '<Roll>k__BackingField'), Name: text(object.members, '<Name>k__BackingField'), Conclusion: nullableText(object.members, '<Conclusion>k__BackingField'), GradedItems: decodeList(object.members['<GradedItems>k__BackingField'], decodeGradedItem) }
}

function decodeGradedItem(value: NrbfValue): GradedItem {
  const object = asObject(value, 'FuGrade.GradedItem')
  return { GroupItem: nullableText(object.members, '<GroupItem>k__BackingField'), ItemName: text(object.members, '<ItemName>k__BackingField'), Scale: numberValue(object.members['<Scale>k__BackingField']), GroupMark: numberValue(object.members['<GroupMark>k__BackingField']), Mark: numberValue(object.members['<Mark>k__BackingField']) }
}

function decodeCriteria(root: NrbfObject): { items: FinalThesisGradingItem[] } {
  if (!root.typeName.startsWith(FU_GRADE_LIST_PREFIX) || !root.typeName.includes('FuGrade.FinalThesisGradingItem')) throw new BinaryFormatterError('Legacy file root is not a criteria list.')
  return { items: decodeList(root, decodeCriteriaItem) }
}

function decodeCriteriaItem(value: NrbfValue): FinalThesisGradingItem {
  const object = asObject(value, 'FuGrade.FinalThesisGradingItem')
  return { SubjectCode: text(object.members, '<SubjectCode>k__BackingField'), Major: text(object.members, '<Major>k__BackingField'), Minor: text(object.members, '<Minor>k__BackingField'), ItemGroup: text(object.members, '<ItemGroup>k__BackingField'), GradingItem: text(object.members, '<GradingItem>k__BackingField'), Scale: numberValue(object.members['<Scale>k__BackingField']) }
}

function encodeThesisComment(value: ThesisComment): NrbfObject { return object('FuGrade.ThesisComment', { '<Teacher>k__BackingField': value.Teacher, '<DT>k__BackingField': toDateTime(value.DT), '<SubjectCode>k__BackingField': value.SubjectCode, '<ClassName>k__BackingField': value.ClassName || null, '<Semester>k__BackingField': value.Semester || null, '<Password>k__BackingField': value.Password || null, '<TitleVN>k__BackingField': value.TitleVN, '<TitleEN>k__BackingField': value.TitleEN, '<Content>k__BackingField': value.Content, '<Form>k__BackingField': value.Form, '<Attitude>k__BackingField': value.Attitude, '<Achievement>k__BackingField': value.Achievement, '<Limitation>k__BackingField': value.Limitation, '<Conclusion>k__BackingField': list('FuGrade.ThesisStudent', value.Conclusion.map(encodeThesisStudent)) }) }
function encodeThesisStudent(value: ThesisStudent): NrbfObject { return object('FuGrade.ThesisStudent', { '<Roll>k__BackingField': value.Roll, '<Name>k__BackingField': value.Name, '<Agree_to_defense>k__BackingField': value.Agree_to_defense, '<Revised_for_the_second_defense>k__BackingField': value.Revised_for_the_second_defense, '<Disagree_to_defense>k__BackingField': value.Disagree_to_defense, '<Note>k__BackingField': value.Note }) }
function encodeDefenseGrading(value: DefenseGrading): NrbfObject {
  return object(
    'FuGrade.DefenseGrading',
    {
      '<SubjectCode>k__BackingField': value.SubjectCode,
      '<TitleVN>k__BackingField': value.TitleVN,
      '<TitleEN>k__BackingField': value.TitleEN,
      '<Supervisor>k__BackingField': value.Supervisor,
      '<ClassName>k__BackingField': value.ClassName,
      '<Semester>k__BackingField': value.Semester,
      '<GroupMark>k__BackingField': value.GroupMark,
      '<GradedTime>k__BackingField': toDateTime(value.GradedTime),
      '<GradedTeacher>k__BackingField': value.GradedTeacher,
      '<SupervisorComment>k__BackingField': value.SupervisorComment ? encodeThesisComment(value.SupervisorComment) : null,
      '<Password>k__BackingField': value.Password || null,
      '<Note>k__BackingField': value.Note || null,
      '<GradeStudents>k__BackingField': list('FuGrade.DefenseStudentGrade', value.GradeStudents.map(encodeDefenseStudent)),
    },
    { '<GroupMark>k__BackingField': 11 },
  )
}
function encodeDefenseStudent(value: DefenseStudentGrade): NrbfObject { return object('FuGrade.DefenseStudentGrade', { '<Roll>k__BackingField': value.Roll, '<Name>k__BackingField': value.Name, '<Conclusion>k__BackingField': value.Conclusion, '<GradedItems>k__BackingField': list('FuGrade.GradedItem', value.GradedItems.map(encodeGradedItem)) }) }
function encodeGradedItem(value: GradedItem): NrbfObject { return object('FuGrade.GradedItem', { '<GroupItem>k__BackingField': value.GroupItem, '<ItemName>k__BackingField': value.ItemName, '<Scale>k__BackingField': value.Scale, '<GroupMark>k__BackingField': value.GroupMark, '<Mark>k__BackingField': value.Mark }, { '<Scale>k__BackingField': 11, '<GroupMark>k__BackingField': 11, '<Mark>k__BackingField': 11 }) }
function encodeCriteria(value: FinalThesisGradingItem[]): NrbfObject { return list('FuGrade.FinalThesisGradingItem', value.map((item) => object('FuGrade.FinalThesisGradingItem', { '<SubjectCode>k__BackingField': item.SubjectCode, '<Major>k__BackingField': item.Major, '<Minor>k__BackingField': item.Minor, '<ItemGroup>k__BackingField': item.ItemGroup, '<GradingItem>k__BackingField': item.GradingItem, '<Scale>k__BackingField': item.Scale }, { '<Scale>k__BackingField': 11 }))) }

function object(typeName: string, members: Record<string, NrbfValue>, memberTypes?: Record<string, number>): NrbfObject { return { typeName, libraryName: LEGACY_ASSEMBLY, members, ...(memberTypes ? { memberTypes } : {}) } }
function list(typeName: string, items: NrbfValue[]): NrbfObject { return { typeName: `${FU_GRADE_LIST_PREFIX}[${typeName}, ${LEGACY_ASSEMBLY}]]`, libraryName: 'System, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089', members: { _items: items, _size: items.length, _version: items.length }, memberTypes: { _size: 8, _version: 8 } } }
function toDateTime(value: string) { const date = new Date(value); const ticks = BigInt(date.getTime()) * 10_000n + 621355968000000000n; return { kind: 1, ticks } }
function asObject(value: NrbfValue, expected?: string): NrbfObject { if (!isNrbfObject(value) || (expected && value.typeName !== expected)) throw new BinaryFormatterError(`Expected ${expected || 'legacy object'}.`); return value }
function requireType(value: NrbfObject, expected: string) { if (value.typeName !== expected || value.libraryName !== LEGACY_ASSEMBLY) throw new BinaryFormatterError(`Unsupported legacy root ${value.typeName}.`) }
function isNrbfObject(value: unknown): value is NrbfObject { return typeof value === 'object' && value !== null && 'typeName' in value && 'members' in value }
function decodeList<T>(value: NrbfValue, decoder: (value: NrbfValue) => T): T[] { const object = asObject(value); const items = object.members._items; if (!Array.isArray(items)) throw new BinaryFormatterError('Legacy list payload is invalid.'); const size = numberValue(object.members._size); return items.slice(0, size).filter((item): item is NrbfValue => item != null).map(decoder) }
function text(members: Record<string, NrbfValue>, key: string) { const value = members[key]; if (typeof value !== 'string') throw new BinaryFormatterError(`Legacy field ${key} is not text.`); return value }
function nullableText(members: Record<string, NrbfValue>, key: string) { const value = members[key]; if (value == null) return null; if (typeof value !== 'string') throw new BinaryFormatterError(`Legacy field ${key} is not nullable text.`); return value }
function numberValue(value: NrbfValue) { if (typeof value !== 'number') throw new BinaryFormatterError('Legacy numeric field is invalid.'); return value }
function dateText(members: Record<string, NrbfValue>, key: string) { const value = members[key]; if (!value || typeof value !== 'object' || !('ticks' in value)) throw new BinaryFormatterError(`Legacy field ${key} is not DateTime.`); const ticks = BigInt(value.ticks as bigint); return new Date(Number((ticks - 621355968000000000n) / 10_000n)).toISOString() }
