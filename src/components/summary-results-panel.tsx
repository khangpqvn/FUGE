import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import type { SummaryResult } from '../types/models'
import { summarizeSelectedFiles, type SummaryWorkflowResult } from '../lib/summary-workflow'
import { summaryWorkbookBlob } from '../lib/xlsx-export'
import { downloadBlob } from '../lib/legacy-fg'
import { PanelSection } from './form-controls'

export function SummaryResultsPanel({ initialResult, onClose }: { initialResult?: SummaryResult; onClose: () => void }) {
  const [result, setResult] = useState<SummaryWorkflowResult | null>(initialResult ? { ...initialResult, files: [] } : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState('')

  const loadFiles = async (selected: FileList | null) => {
    if (!selected?.length) return
    setBusy(true)
    setError('')
    setFiles(`${selected.length} file(s) selected`)
    try {
      const summary = await summarizeSelectedFiles(Array.from(selected))
      setResult(summary)
    } catch (cause) {
      setResult(null)
      setError(cause instanceof Error ? cause.message : 'Could not summarize the selected files.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PanelSection title="Defense result summary" description="Load canonical .fuge.json defense files, or .tef files when the legacy bridge is configured.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Upload size={16} /> {busy ? 'Reading…' : files || 'Choose defense files'}
            <input type="file" multiple accept=".json,.tef" className="hidden" disabled={busy} onChange={(event) => void loadFiles(event.target.files)} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Choose folder
            <input type="file" accept=".json,.tef" className="hidden" {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} disabled={busy} onChange={(event) => void loadFiles(event.target.files)} />
          </label>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Back</button>
          {result ? <button type="button" onClick={() => downloadBlob(summaryWorkbookBlob(result), 'fugrade-defense-summary.xlsx')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Download size={16} /> Export .xlsx</button> : null}
        </div>
        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      </PanelSection>

      {result?.files?.some((file) => file.status === 'failed') ? (
        <PanelSection title="File validation" description="Some selected files were not included in the aggregate.">
          <ul className="space-y-1 text-sm text-red-700">
            {result.files.filter((file) => file.status === 'failed').map((file) => <li key={`${file.group}-${file.name}`}><strong>{file.group}</strong> · {file.name}: {file.message}</li>)}
          </ul>
        </PanelSection>
      ) : null}

      {result ? (
        <PanelSection title={`${result.groups} group · ${result.students} student(s)`} description="Average marks use the legacy one-decimal half-away-from-zero rule.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Roll</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Scale</th><th className="px-3 py-2">Mark</th><th className="px-3 py-2">Evaluators</th><th className="px-3 py-2">Note</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{result.grades.map((grade) => <tr key={grade.Roll}><td className="px-3 py-2 font-mono">{grade.Roll}</td><td className="px-3 py-2">{grade.Name}</td><td className="px-3 py-2">{grade.Title}</td><td className="px-3 py-2">{grade.Scale}</td><td className="px-3 py-2 font-semibold">{grade.AvgMark}</td><td className="px-3 py-2">{grade.ListFGOT.map((teacher) => `${teacher.GradedTeacher}: ${teacher.Mark}`).join(' · ')}</td><td className="px-3 py-2">{grade.Note}</td></tr>)}</tbody>
            </table>
          </div>
        </PanelSection>
      ) : null}
    </div>
  )
}
