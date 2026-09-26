import { useState } from 'react'
import { BarChart3, Download, Table2, Upload } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'summary' | 'statistics'>('summary')

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
      <PanelSection
        title="Defense result summary (Tổng hợp kết quả bảo vệ)"
        description="Load .tef evaluation files or canonical .fuge.json files across all defense council groups."
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Upload size={16} /> {busy ? 'Reading…' : files || 'Choose defense files'}
            <input type="file" multiple accept=".tef" className="hidden" disabled={busy} onChange={(event) => void loadFiles(event.target.files)} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Choose folder
            <input type="file" accept=".tef" className="hidden" {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} disabled={busy} onChange={(event) => void loadFiles(event.target.files)} />
          </label>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Back</button>
          {result ? (
            <button
              type="button"
              onClick={() => downloadBlob(summaryWorkbookBlob(result), 'fugrade-defense-summary.xlsx')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Download size={16} /> Export .xlsx (2 Sheets)
            </button>
          ) : null}
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
        <div className="space-y-4">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Table2 size={16} /> Sheet 1: Summary ({result.students} students in {result.groups} group(s))
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('statistics')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'statistics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 size={16} /> Sheet 2: Graded Statistics ({result.teachers.length} evaluations)
            </button>
          </div>

          {activeTab === 'summary' ? (
            <PanelSection title={`Summary Sheet · ${result.groups} group(s) · ${result.students} student(s)`} description="Average marks use the legacy one-decimal half-away-from-zero rule.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left uppercase text-slate-500">
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Roll Number</th>
                      <th className="px-3 py-2.5">Full Name</th>
                      <th className="px-3 py-2.5">Subject</th>
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5">Thesis Title</th>
                      <th className="px-3 py-2.5">Supervisor</th>
                      <th className="px-3 py-2.5 text-center">Scale</th>
                      <th className="px-3 py-2.5 text-center">Avg Mark</th>
                      <th className="px-3 py-2.5">Evaluator Marks</th>
                      <th className="px-3 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.grades.map((grade, idx) => (
                      <tr key={`${grade.Roll}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-medium text-slate-700">{grade.Roll}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{grade.Name}</td>
                        <td className="px-3 py-2 text-slate-600">{grade.SubjectCode}</td>
                        <td className="px-3 py-2 text-slate-600">{grade.ClassName}</td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-700" title={grade.Title}>{grade.Title}</td>
                        <td className="px-3 py-2 text-slate-600">{grade.Supervisor}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{grade.Scale}</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-600">{grade.AvgMark}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {grade.ListFGOT.map((t) => `${t.GradedTeacher}: ${t.Mark}`).join(' · ')}
                        </td>
                        <td className="px-3 py-2">
                          {grade.Note ? (
                            <span className={grade.Note.includes('Disagree') ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                              {grade.Note}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelSection>
          ) : (
            <PanelSection title="Graded Statistics Sheet" description="Audit log of all evaluation sessions and timestamps.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left uppercase text-slate-500">
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Teacher</th>
                      <th className="px-3 py-2.5">Subject</th>
                      <th className="px-3 py-2.5">Group Name</th>
                      <th className="px-3 py-2.5">Title</th>
                      <th className="px-3 py-2.5">Supervisor</th>
                      <th className="px-3 py-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.teachers.map((teacher, idx) => (
                      <tr key={`${teacher.Name}-${teacher.DT}-${idx}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{teacher.Name}</td>
                        <td className="px-3 py-2 text-slate-600">{teacher.Subject}</td>
                        <td className="px-3 py-2 text-slate-600">{teacher.GroupName}</td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-700" title={teacher.Title}>{teacher.Title}</td>
                        <td className="px-3 py-2 text-slate-600">{teacher.Supervisor}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{teacher.DT}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelSection>
          )}
        </div>
      ) : null}
    </div>
  )
}
