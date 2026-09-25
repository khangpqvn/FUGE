import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import type { ThesisComment, ThesisStudent } from '../types/models'
import { validatePayload } from '../lib/document-validation'
import { PanelSection, TextAreaField, TextField, ValidationList } from './form-controls'

type ConclusionField = 'Agree_to_defense' | 'Revised_for_the_second_defense' | 'Disagree_to_defense'

const CONCLUSION_COLUMNS: Array<{ field: ConclusionField; label: string }> = [
  { field: 'Agree_to_defense', label: 'Agree to defense' },
  { field: 'Revised_for_the_second_defense', label: 'Revised for 2nd defense' },
  { field: 'Disagree_to_defense', label: 'Disagree to defense' },
]

interface Props {
  comment: ThesisComment
  readOnly?: boolean
  onChange: (comment: ThesisComment) => void
}

export function ThesisCommentPanel({ comment, readOnly = false, onChange }: Props) {
  const [newRoll, setNewRoll] = useState('')
  const [newName, setNewName] = useState('')
  const errors = validatePayload('thesis-comment', comment)

  const patch = (changes: Partial<ThesisComment>) => onChange({ ...comment, ...changes })

  const setConclusion = (index: number, field: ConclusionField) => {
    const students = comment.Conclusion.map((student, position) => {
      if (position !== index) return student
      const alreadySet = student[field]?.trim().toLowerCase() === 'x'
      return {
        ...student,
        Agree_to_defense: null,
        Revised_for_the_second_defense: null,
        Disagree_to_defense: null,
        [field]: alreadySet ? null : 'x',
      } as ThesisStudent
    })
    patch({ Conclusion: students })
  }

  const addStudent = () => {
    const roll = newRoll.trim().toUpperCase()
    if (!roll) return
    if (comment.Conclusion.some((student) => student.Roll.trim().toUpperCase() === roll)) return
    patch({
      Conclusion: [
        ...comment.Conclusion,
        {
          Roll: roll,
          Name: newName.trim(),
          Agree_to_defense: null,
          Revised_for_the_second_defense: null,
          Disagree_to_defense: null,
          Note: '',
        },
      ],
    })
    setNewRoll('')
    setNewName('')
  }

  return (
    <div className="space-y-5">
      <PanelSection title="Thesis metadata" description={`Last updated ${formatDate(comment.DT)}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Supervisor" value={comment.Teacher} disabled={readOnly} onChange={(value) => patch({ Teacher: value })} />
          <TextField label="Subject code" value={comment.SubjectCode} disabled={readOnly} onChange={(value) => patch({ SubjectCode: value })} />
          <TextField label="Class" value={comment.ClassName} disabled={readOnly} onChange={(value) => patch({ ClassName: value })} />
          <TextField label="Semester" value={comment.Semester} disabled={readOnly} onChange={(value) => patch({ Semester: value })} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Title (Vietnamese)" value={comment.TitleVN} disabled={readOnly} onChange={(value) => patch({ TitleVN: value })} />
          <TextField label="Title (English)" value={comment.TitleEN} disabled={readOnly} onChange={(value) => patch({ TitleEN: value })} />
        </div>
      </PanelSection>

      <PanelSection title="Supervisor evaluation" description="Every section below is required by the legacy .cmt validation.">
        <div className="grid gap-4 xl:grid-cols-2">
          <TextAreaField label="3.1 Thesis content" required value={comment.Content} disabled={readOnly} onChange={(value) => patch({ Content: value })} />
          <TextAreaField label="3.2 Thesis form" required value={comment.Form} disabled={readOnly} onChange={(value) => patch({ Form: value })} />
          <TextAreaField label="3.3 Student attitude" required value={comment.Attitude} disabled={readOnly} onChange={(value) => patch({ Attitude: value })} />
          <TextAreaField label="4.1 Achievement level" required value={comment.Achievement} disabled={readOnly} onChange={(value) => patch({ Achievement: value })} />
          <TextAreaField label="4.2 Limitation" required value={comment.Limitation} disabled={readOnly} onChange={(value) => patch({ Limitation: value })} />
        </div>
      </PanelSection>

      <PanelSection
        title="Defense conclusion"
        description="Each student needs exactly one conclusion, matching the legacy x / X rule."
        action={
          readOnly ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newRoll}
                onChange={(event) => setNewRoll(event.target.value)}
                placeholder="Roll"
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
              />
              <input
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Full name"
                className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
              />
              <button
                type="button"
                onClick={addStudent}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <UserPlus size={15} /> Add
              </button>
            </div>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="w-12 px-3 py-2">#</th>
                <th className="w-32 px-3 py-2">Roll</th>
                <th className="min-w-44 px-3 py-2">Name</th>
                {CONCLUSION_COLUMNS.map((column) => (
                  <th key={column.field} className="w-40 px-3 py-2 text-center">
                    {column.label}
                  </th>
                ))}
                <th className="min-w-48 px-3 py-2">Note</th>
                {readOnly ? null : <th className="w-12 px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comment.Conclusion.map((student, index) => (
                <tr key={`${student.Roll}-${index}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-400">{index + 1}</td>
                  <td className="px-3 py-2 font-mono font-medium text-slate-700">{student.Roll}</td>
                  <td className="px-3 py-2 text-slate-800">{student.Name}</td>
                  {CONCLUSION_COLUMNS.map((column) => (
                    <td key={column.field} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={student[column.field]?.trim().toLowerCase() === 'x'}
                        onChange={() => setConclusion(index, column.field)}
                        aria-label={`${column.label} for ${student.Roll}`}
                        className="size-4 rounded"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={student.Note ?? ''}
                      disabled={readOnly}
                      onChange={(event) =>
                        patch({
                          Conclusion: comment.Conclusion.map((candidate, position) =>
                            position === index ? { ...candidate, Note: event.target.value } : candidate,
                          ),
                        })
                      }
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none transition hover:border-slate-300 focus-visible:border-blue-500"
                    />
                  </td>
                  {readOnly ? null : (
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => patch({ Conclusion: comment.Conclusion.filter((_, position) => position !== index) })}
                        aria-label={`Remove ${student.Roll}`}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {comment.Conclusion.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 7 : 8} className="px-3 py-10 text-center text-slate-400 italic">
                    No student in this thesis group yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PanelSection>

      <ValidationList errors={errors} />
    </div>
  )
}

export function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value || 'unknown' : parsed.toLocaleString()
}
