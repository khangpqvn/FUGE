import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FinalThesisGradingItem } from '../types/models'
import { validatePayload } from '../lib/document-validation'
import { PanelSection, ValidationList } from './form-controls'

interface Props {
  items: FinalThesisGradingItem[]
  onChange: (items: FinalThesisGradingItem[]) => void
}

const EMPTY_DRAFT: FinalThesisGradingItem = { SubjectCode: '', Major: '', Minor: '', ItemGroup: '', GradingItem: '', Scale: 0 }

export function CriteriaPanel({ items, onChange }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('')
  const [draft, setDraft] = useState<FinalThesisGradingItem>(EMPTY_DRAFT)
  const [message, setMessage] = useState('')

  const subjects = useMemo(
    () => Array.from(new Set(items.map((item) => item.SubjectCode.trim().toUpperCase()).filter(Boolean))).sort(),
    [items],
  )
  const visible = useMemo(() => {
    const indexed = items.map((item, index) => ({ item, index }))
    if (!subjectFilter) return indexed
    return indexed.filter((entry) => entry.item.SubjectCode.trim().toUpperCase() === subjectFilter)
  }, [items, subjectFilter])
  const totalScale = visible.reduce((sum, entry) => sum + entry.item.Scale, 0)
  const errors = validatePayload('final-thesis-grading-items', { items })

  const updateItem = (index: number, changes: Partial<FinalThesisGradingItem>) =>
    onChange(items.map((item, position) => (position === index ? { ...item, ...changes } : item)))

  const addItem = () => {
    const subjectCode = draft.SubjectCode.trim().toUpperCase()
    const gradingItem = draft.GradingItem.trim()
    if (!subjectCode) return setMessage('Subject code is required.')
    if (!gradingItem) return setMessage('Grading item is required.')
    if (!Number.isFinite(draft.Scale) || draft.Scale <= 0) return setMessage('Scale must be a positive number.')
    const duplicate = items.some(
      (item) =>
        item.SubjectCode.trim().toUpperCase() === subjectCode && item.GradingItem.trim().toLowerCase() === gradingItem.toLowerCase(),
    )
    if (duplicate) return setMessage(`“${gradingItem}” already exists for ${subjectCode}.`)
    onChange([
      ...items,
      {
        SubjectCode: subjectCode,
        Major: draft.Major.trim().toUpperCase(),
        Minor: draft.Minor.trim().toUpperCase(),
        ItemGroup: draft.ItemGroup.trim(),
        GradingItem: gradingItem,
        Scale: draft.Scale,
      },
    ])
    setDraft({ ...EMPTY_DRAFT, SubjectCode: subjectCode, Major: draft.Major, Minor: draft.Minor })
    setMessage(`Added “${gradingItem}” to ${subjectCode}.`)
  }

  return (
    <div className="space-y-5">
      <PanelSection
        title="Master criteria"
        description={`${items.length} criteria total · ${visible.length} shown · scale ${round(totalScale)}`}
        action={
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus-visible:border-blue-500"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        }
      >
        {message ? <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <th className="w-12 px-3 py-2">#</th>
                <th className="w-32 px-3 py-2">Subject</th>
                <th className="w-24 px-3 py-2">Major</th>
                <th className="w-24 px-3 py-2">Minor</th>
                <th className="min-w-40 px-3 py-2">Item group</th>
                <th className="min-w-64 px-3 py-2">Grading item</th>
                <th className="w-24 px-3 py-2 text-center">Scale</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((entry, position) => (
                <tr key={`${entry.item.SubjectCode}-${entry.item.GradingItem}-${entry.index}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center text-slate-400">{position + 1}</td>
                  <Cell value={entry.item.SubjectCode} onCommit={(value) => updateItem(entry.index, { SubjectCode: value.toUpperCase() })} />
                  <Cell value={entry.item.Major} onCommit={(value) => updateItem(entry.index, { Major: value.toUpperCase() })} />
                  <Cell value={entry.item.Minor} onCommit={(value) => updateItem(entry.index, { Minor: value.toUpperCase() })} />
                  <Cell value={entry.item.ItemGroup} onCommit={(value) => updateItem(entry.index, { ItemGroup: value })} />
                  <Cell value={entry.item.GradingItem} onCommit={(value) => updateItem(entry.index, { GradingItem: value })} />
                  <td className="px-3 py-2 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Scale for ${entry.item.GradingItem}`}
                      key={`scale-${entry.index}-${entry.item.Scale}`}
                      defaultValue={String(round(entry.item.Scale))}
                      onBlur={(event) => {
                        const value = Number(event.target.value.trim())
                        if (!Number.isFinite(value) || value <= 0) {
                          setMessage(`Scale for “${entry.item.GradingItem}” must be a positive number.`)
                          return
                        }
                        setMessage('')
                        updateItem(entry.index, { Scale: value })
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-center outline-none focus-visible:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      aria-label={`Delete ${entry.item.GradingItem}`}
                      onClick={() => onChange(items.filter((_, index) => index !== entry.index))}
                      className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400 italic">
                    No criterion yet. Add the first one below.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PanelSection>

      <PanelSection title="Add criterion">
        <div className="grid gap-3 md:grid-cols-6">
          <DraftInput label="Subject" value={draft.SubjectCode} onChange={(value) => setDraft({ ...draft, SubjectCode: value })} />
          <DraftInput label="Major" value={draft.Major} onChange={(value) => setDraft({ ...draft, Major: value })} />
          <DraftInput label="Minor" value={draft.Minor} onChange={(value) => setDraft({ ...draft, Minor: value })} />
          <DraftInput label="Item group" value={draft.ItemGroup} onChange={(value) => setDraft({ ...draft, ItemGroup: value })} />
          <DraftInput label="Grading item" value={draft.GradingItem} onChange={(value) => setDraft({ ...draft, GradingItem: value })} />
          <DraftInput
            label="Scale"
            value={draft.Scale === 0 ? '' : String(draft.Scale)}
            onChange={(value) => setDraft({ ...draft, Scale: Number(value) || 0 })}
          />
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={16} /> Add criterion
        </button>
      </PanelSection>

      <ValidationList errors={errors} />
    </div>
  )
}

function Cell({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  return (
    <td className="px-3 py-2">
      <input
        type="text"
        key={value}
        defaultValue={value}
        onBlur={(event) => onCommit(event.target.value)}
        className="w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none transition hover:border-slate-300 focus-visible:border-blue-500"
      />
    </td>
  )
}

function DraftInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500"
      />
    </label>
  )
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
