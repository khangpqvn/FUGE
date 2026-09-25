import { useMemo, useState } from 'react'
import { ClipboardCopy, Eye, EyeOff } from 'lucide-react'
import type { DefenseGrading } from '../types/models'
import { validatePayload } from '../lib/document-validation'
import { PanelSection, TextAreaField, TextField, ValidationList } from './form-controls'
import { ThesisCommentPanel, formatDate } from './thesis-comment-panel'

interface Props {
  defense: DefenseGrading
  readOnly?: boolean
  onChange: (defense: DefenseGrading) => void
}

export function DefenseGradingPanel({ defense, readOnly = false, onChange }: Props) {
  const [showSupervisorComment, setShowSupervisorComment] = useState(false)
  const [cellError, setCellError] = useState('')
  const template = defense.GradeStudents[0]?.GradedItems ?? []
  const hasItemGroup = template.some((item) => (item.GroupItem ?? '').trim() !== '')

  const totals = useMemo(
    () => ({
      scale: template.reduce((sum, item) => sum + item.Scale, 0),
      group: template.reduce((sum, item) => sum + item.GroupMark, 0),
      students: defense.GradeStudents.map((student) => student.GradedItems.reduce((sum, item) => sum + item.Mark, 0)),
    }),
    [defense.GradeStudents, template],
  )
  const errors = validatePayload('defense-grading', defense)

  const patch = (changes: Partial<DefenseGrading>) => onChange({ ...defense, ...changes })

  const writeMark = (rowIndex: number, studentIndex: number | 'group', input: HTMLInputElement, committed: number) => {
    const scale = template[rowIndex]?.Scale ?? 0
    const text = input.value.trim()
    const value = text === '' ? 0 : Number(text)
    const revert = () => {
      input.value = committed === 0 ? '' : String(Math.round(committed * 100) / 100)
    }
    if (!Number.isFinite(value) || value < 0) {
      setCellError(`${template[rowIndex]?.ItemName}: mark must be a positive number.`)
      revert()
      return
    }
    if (value > scale) {
      setCellError(`${template[rowIndex]?.ItemName}: mark must be ≤ ${scale}.`)
      revert()
      return
    }
    setCellError('')
    patch({
      GradeStudents: defense.GradeStudents.map((student, index) => ({
        ...student,
        GradedItems: student.GradedItems.map((item, position) => {
          if (position !== rowIndex) return item
          if (studentIndex === 'group') return { ...item, GroupMark: value }
          return index === studentIndex ? { ...item, Mark: value } : item
        }),
      })),
    })
  }

  const copyGroupMarks = () => {
    setCellError('')
    patch({
      GradeStudents: defense.GradeStudents.map((student) => ({
        ...student,
        GradedItems: student.GradedItems.map((item, position) => ({ ...item, Mark: template[position]?.GroupMark ?? item.GroupMark })),
      })),
    })
  }

  return (
    <div className="space-y-5">
      <PanelSection title="Defense group" description={`Graded ${formatDate(defense.GradedTime)}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Subject code" value={defense.SubjectCode} disabled={readOnly} onChange={(value) => patch({ SubjectCode: value })} />
          <TextField label="Supervisor" value={defense.Supervisor} disabled={readOnly} onChange={(value) => patch({ Supervisor: value })} />
          <TextField
            label="Evaluator"
            value={defense.GradedTeacher}
            disabled={readOnly}
            hint="Legacy .tef filenames reject accents in this field."
            onChange={(value) => patch({ GradedTeacher: value })}
          />
          <TextField label="Class / semester" value={`${defense.ClassName} · ${defense.Semester}`} disabled onChange={() => undefined} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Title (Vietnamese)" value={defense.TitleVN} disabled={readOnly} onChange={(value) => patch({ TitleVN: value })} />
          <TextField label="Title (English)" value={defense.TitleEN} disabled={readOnly} onChange={(value) => patch({ TitleEN: value })} />
        </div>
      </PanelSection>

      <PanelSection
        title="Evaluation form"
        description={`${template.length} criteria · total scale ${round(totals.scale)}`}
        action={
          readOnly ? null : (
            <button
              type="button"
              onClick={copyGroupMarks}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <ClipboardCopy size={15} /> Copy group mark to every student
            </button>
          )
        }
      >
        {cellError ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{cellError}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="w-12 px-3 py-2">#</th>
                {hasItemGroup ? <th className="min-w-40 px-3 py-2">Group</th> : null}
                <th className="min-w-64 px-3 py-2">Criteria</th>
                <th className="w-24 px-3 py-2 text-center">Max</th>
                <th className="w-28 px-3 py-2 text-center">Group mark</th>
                {defense.GradeStudents.map((student) => (
                  <th key={student.Roll} className="w-32 px-3 py-2 text-center">
                    <span className="block">{student.Name}</span>
                    <span className="block font-mono text-[11px] normal-case">{student.Roll}</span>
                    {student.Conclusion ? null : <span className="block text-[10px] text-amber-600 normal-case">disagree to defense</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {template.map((item, rowIndex) => (
                <tr key={`${item.ItemName}-${rowIndex}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-400">{rowIndex + 1}</td>
                  {hasItemGroup ? <td className="px-3 py-2 text-slate-500">{item.GroupItem ?? ''}</td> : null}
                  <td className="px-3 py-2 text-slate-800">{item.ItemName}</td>
                  <td className="px-3 py-2 text-center font-medium text-slate-500">{round(item.Scale)}</td>
                  <td className="px-3 py-2 text-center">
                    <MarkInput
                      value={item.GroupMark}
                      disabled={readOnly}
                      label={`Group mark for ${item.ItemName}`}
                      onCommit={(input) => writeMark(rowIndex, 'group', input, item.GroupMark)}
                    />
                  </td>
                  {defense.GradeStudents.map((student, studentIndex) => (
                    <td key={`${student.Roll}-${rowIndex}`} className="px-3 py-2 text-center">
                      <MarkInput
                        value={student.GradedItems[rowIndex]?.Mark ?? 0}
                        disabled={readOnly}
                        label={`${item.ItemName} mark for ${student.Roll}`}
                        onCommit={(input) => writeMark(rowIndex, studentIndex, input, student.GradedItems[rowIndex]?.Mark ?? 0)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2" />
                {hasItemGroup ? <td className="px-3 py-2" /> : null}
                <td className="px-3 py-2 text-slate-600">Total</td>
                <td className="px-3 py-2 text-center">{round(totals.scale)}</td>
                <td className="px-3 py-2 text-center">{round(totals.group)}</td>
                {totals.students.map((total, index) => (
                  <td key={defense.GradeStudents[index].Roll} className="px-3 py-2 text-center">
                    {round(total)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {template.length === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This defense sheet has no criteria. Build it from a supervisor comment plus a master criteria file.
          </p>
        ) : null}
        <div className="mt-4">
          <TextAreaField label="Group note" rows={3} value={defense.Note ?? ''} disabled={readOnly} onChange={(value) => patch({ Note: value })} />
        </div>
      </PanelSection>

      {defense.SupervisorComment ? (
        <PanelSection
          title="Supervisor comment"
          description="Read-only copy embedded in the .tef document."
          action={
            <button
              type="button"
              onClick={() => setShowSupervisorComment((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {showSupervisorComment ? <EyeOff size={15} /> : <Eye size={15} />}
              {showSupervisorComment ? 'Hide' : 'Show'}
            </button>
          }
        >
          {showSupervisorComment ? (
            <ThesisCommentPanel comment={defense.SupervisorComment} readOnly onChange={() => undefined} />
          ) : (
            <p className="text-sm text-slate-500">
              {defense.SupervisorComment.Teacher || 'Supervisor'} · {defense.SupervisorComment.Conclusion.length} student(s)
            </p>
          )}
        </PanelSection>
      ) : null}

      <ValidationList errors={errors} />
    </div>
  )
}

function MarkInput({
  value,
  disabled,
  label,
  onCommit,
}: {
  value: number
  disabled?: boolean
  label: string
  onCommit: (input: HTMLInputElement) => void
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={label}
      key={`${label}-${value}`}
      defaultValue={value === 0 ? '' : String(round(value))}
      onBlur={(event) => onCommit(event.target)}
      className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-center outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:bg-slate-100"
    />
  )
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
