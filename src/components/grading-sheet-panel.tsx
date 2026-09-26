import { useMemo, useState } from 'react'
import { Eraser, MessageSquare, Plus, Search, UserPlus } from 'lucide-react'
import type { GradeValue, SubjectClassGrade, TeacherGrade } from '../types/models'
import {
  MERGED_CLASS_LABEL,
  addComponent,
  addStudent,
  applyPastedComments,
  applyPastedMarks,
  classesShareComponents,
  clearComponent,
  groupLabel,
  isStatusComponent,
  mergedGroup,
  parseMark,
  parsePastedRows,
  setStudentComment,
  setStudentMark,
} from '../lib/grading-edits'
import { PanelSection } from './form-controls'

interface Props {
  sheet: TeacherGrade
  onChange: (sheet: TeacherGrade) => void
  onCreateThesisComment?: (group: SubjectClassGrade) => void
}

export function GradingSheetPanel({ sheet, onChange, onCreateThesisComment }: Props) {
  const [groupIndex, setGroupIndex] = useState(0)
  const [merge, setMerge] = useState(false)
  const [query, setQuery] = useState('')
  const [hiddenComponents, setHiddenComponents] = useState<string[]>([])
  const [newRoll, setNewRoll] = useState('')
  const [newName, setNewName] = useState('')
  const [newComponent, setNewComponent] = useState('')
  const [pasteComponent, setPasteComponent] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [skipFirstRow, setSkipFirstRow] = useState(false)
  const [message, setMessage] = useState('')
  const [cellError, setCellError] = useState('')

  const canMerge = classesShareComponents(sheet) && sheet.SubjectClassGrades.length > 1
  const activeGroup: SubjectClassGrade | null = merge && canMerge ? mergedGroup(sheet) : sheet.SubjectClassGrades[groupIndex] ?? null
  const visibleComponents = useMemo(
    () => (activeGroup ? activeGroup.Components.filter((component) => !hiddenComponents.includes(component)) : []),
    [activeGroup, hiddenComponents],
  )
  const students = useMemo(() => {
    if (!activeGroup) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return activeGroup.Students
    return activeGroup.Students.filter(
      (student) => student.Roll.toLowerCase().includes(needle) || student.Name.toLowerCase().includes(needle),
    )
  }, [activeGroup, query])

  if (!activeGroup) {
    return <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">This grading file has no subject/class groups.</p>
  }

  /** Legacy FrmFuGrade discards an invalid entry, so the cell is reverted instead of left out of sync. */
  const handleMark = (roll: string, component: string, input: HTMLInputElement, committed: GradeValue) => {
    const parsed = parseMark(component, input.value)
    if ('error' in parsed) {
      setCellError(`${roll} · ${component}: ${parsed.error}`)
      input.value = committed == null ? '' : String(committed)
      return
    }
    setCellError('')
    onChange(setStudentMark(sheet, roll, component, parsed.value))
  }

  const handleAddStudent = () => {
    const result = addStudent(sheet, groupIndex, newRoll, newName)
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    onChange(result)
    setMessage(`Added ${newRoll.trim().toUpperCase()} to ${groupLabel(sheet.SubjectClassGrades[groupIndex])}.`)
    setNewRoll('')
    setNewName('')
  }

  const handleAddComponent = () => {
    const result = addComponent(sheet, groupIndex, newComponent)
    if ('error' in result) {
      setMessage(result.error)
      return
    }
    onChange(result)
    setMessage(`Added component “${newComponent.trim()}”.`)
    setNewComponent('')
  }

  const handlePaste = () => {
    const wantsMarks = pasteComponent !== ''
    const parsed = parsePastedRows(pasteText, skipFirstRow, wantsMarks)
    if ('error' in parsed) {
      setMessage(parsed.error)
      return
    }
    if (wantsMarks) {
      const outcome = applyPastedMarks(sheet, pasteComponent, parsed.rows)
      if ('error' in outcome) {
        setMessage(outcome.error)
        return
      }
      onChange(outcome.sheet)
      setMessage(summarizeImport(outcome.applied, parsed.rows.length, outcome.missing, `“${pasteComponent}” marks`))
    } else {
      const outcome = applyPastedComments(sheet, parsed.rows)
      onChange(outcome.sheet)
      setMessage(summarizeImport(outcome.applied, parsed.rows.length, outcome.missing, 'comments'))
    }
    setPasteText('')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="space-y-5">
        <PanelSection title="Subject / class" description={`${sheet.SubjectClassGrades.length} group(s) in this file`}>
          <div className="space-y-3">
            {canMerge ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={merge} onChange={(event) => setMerge(event.target.checked)} className="size-4 rounded" />
                Merge all classes ({MERGED_CLASS_LABEL})
              </label>
            ) : null}
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {sheet.SubjectClassGrades.map((group, index) => (
                <button
                  key={groupLabel(group)}
                  type="button"
                  onClick={() => {
                    setGroupIndex(index)
                    setMerge(false)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    index === groupIndex && !merge ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold">{group.Subject}</span>
                  <span className="block text-xs text-slate-400">
                    {group.Class} · {group.Students.length} students
                  </span>
                </button>
              ))}
            </div>
          </div>
        </PanelSection>

        <PanelSection title="Components" description="Toggle a column, or clear every mark in it.">
          <div className="space-y-2">
            {activeGroup.Components.map((component) => (
              <div key={component} className="flex items-center justify-between gap-2 text-sm">
                <label className="flex min-w-0 items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={!hiddenComponents.includes(component)}
                    onChange={(event) =>
                      setHiddenComponents((current) =>
                        event.target.checked ? current.filter((name) => name !== component) : [...current, component],
                      )
                    }
                    className="size-4 rounded"
                  />
                  <span className="truncate">{component}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onChange(clearComponent(sheet, component))
                    setMessage(`Cleared every “${component}” mark.`)
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  title={`Clear all ${component} marks`}
                >
                  <Eraser size={14} /> clear
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newComponent}
                onChange={(event) => setNewComponent(event.target.value)}
                placeholder="New component"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddComponent}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </PanelSection>

        <PanelSection title="Add student">
          <div className="space-y-2">
            <input
              type="text"
              value={newRoll}
              onChange={(event) => setNewRoll(event.target.value)}
              placeholder="Roll number"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
            />
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddStudent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <UserPlus size={16} /> Add to {sheet.SubjectClassGrades[groupIndex]?.Class ?? '—'}
            </button>
          </div>
        </PanelSection>

        <PanelSection title="Paste import" description="One row per student: roll, then the value.">
          <div className="space-y-2">
            <select
              value={pasteComponent}
              onChange={(event) => setPasteComponent(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
            >
              <option value="">Comments</option>
              {activeGroup.Components.map((component) => (
                <option key={component} value={component}>
                  {component} marks
                </option>
              ))}
            </select>
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={4}
              placeholder={'HE173247\t8.5\nHE173248\t7'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus-visible:border-blue-500"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={skipFirstRow} onChange={(event) => setSkipFirstRow(event.target.checked)} className="size-4 rounded" />
              Skip the first row (header)
            </label>
            <button
              type="button"
              onClick={handlePaste}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Import
            </button>
          </div>
        </PanelSection>
      </div>

      <PanelSection
        title={`${activeGroup.Subject} · ${activeGroup.Class}`}
        description={`${students.length} of ${activeGroup.Students.length} students · ${visibleComponents.length} of ${activeGroup.Components.length} components shown`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {onCreateThesisComment && activeGroup.Students.length > 0 ? (
              <button
                type="button"
                disabled={activeGroup.Students.length > 6}
                onClick={() => onCreateThesisComment(activeGroup)}
                title={
                  activeGroup.Students.length <= 6
                    ? 'Write thesis comment (.cmt) for this group'
                    : 'Thesis comment is only available for classes with ≤ 6 students (MaxThesisGroupSize = 6)'
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <MessageSquare size={14} /> Write thesis comment
              </button>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roll or name"
                className="w-48 rounded-lg border border-slate-300 py-1.5 pr-3 pl-9 text-xs outline-none focus-visible:border-blue-500"
              />
            </div>
          </div>
        }
      >
        {message ? <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm whitespace-pre-line text-blue-800">{message}</p> : null}
        {cellError ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{cellError}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="w-12 px-3 py-2">#</th>
                <th className="w-32 px-3 py-2">Roll</th>
                <th className="min-w-48 px-3 py-2">Name</th>
                <th className="min-w-56 px-3 py-2">Comment</th>
                {visibleComponents.map((component) => (
                  <th key={component} className="w-24 px-3 py-2 text-center">
                    {component}
                    {isStatusComponent(component) ? <span className="block text-[10px] normal-case">1=pass 0=fail</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, index) => (
                <tr key={`${student.Roll}-${index}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-400">{index + 1}</td>
                  <td className="px-3 py-2 font-mono font-medium text-slate-700">{student.Roll}</td>
                  <td className="px-3 py-2 text-slate-800">{student.Name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.Comment ?? ''}
                      onChange={(event) => onChange(setStudentComment(sheet, student.Roll, event.target.value))}
                      placeholder="Add comment"
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none transition hover:border-slate-300 focus-visible:border-blue-500"
                    />
                  </td>
                  {visibleComponents.map((component) => {
                    const grade = student.Grades.find((candidate) => candidate.Component === component)
                    return (
                      <td key={component} className="px-3 py-2 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={grade?.Grade ?? ''}
                          key={`${student.Roll}-${component}-${grade?.Grade ?? 'empty'}`}
                          onBlur={(event) => handleMark(student.Roll, component, event.target, grade?.Grade ?? null)}
                          aria-label={`${component} mark for ${student.Roll}`}
                          className={`w-16 rounded border px-2 py-1 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
                            grade?.Grade == null ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-white'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4 + visibleComponents.length} className="px-3 py-10 text-center text-slate-400 italic">
                    No student matches this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PanelSection>
    </div>
  )
}

function summarizeImport(applied: number, total: number, missing: string[], label: string) {
  const head = `${applied} of ${total} ${label} imported.`
  if (!missing.length) return head
  return `${head}\nNot found: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` …+${missing.length - 10}` : ''}`
}
