import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Award, CheckCircle2, ChevronRight, FileCode, FolderOpen, KeyRound, Lock, ShieldAlert, Upload, Users, X } from 'lucide-react'
import type { CanonicalDocument, DefenseGrading, FinalThesisGradingItem, ThesisComment } from '../types/models'
import { criteriaForSubject, defenseFromComment, isPlainEvaluatorName } from '../lib/blank-documents'
import { PasswordRequiredError, importWorkflowFile } from '../lib/file-import'
import { loadBundledMasterCriteriaFile } from '../lib/bundled-master-criteria'
import { openDefenseInNewTab } from '../lib/pending-defense-handoff'

interface Props {
  onStartDefense: (defenseDoc: CanonicalDocument<DefenseGrading>, readOnly?: boolean) => void
  onOpenSummary: () => void
  onClose: () => void
}

interface LoadedGroup {
  fileName: string
  comment: ThesisComment
  agreedCount: number
}

export function DefenseCouncilDesk({ onStartDefense, onOpenSummary, onClose }: Props) {
  const [groups, setGroups] = useState<LoadedGroup[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [criteria, setCriteria] = useState<FinalThesisGradingItem[] | null>(null)
  const [criteriaName, setCriteriaName] = useState('')
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('')
  const [evaluator, setEvaluator] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingTefFile, setPendingTefFile] = useState<File | null>(null)
  const [tefPassword, setTefPassword] = useState('')
  const [showTefPasswordPrompt, setShowTefPasswordPrompt] = useState(false)

  // Load .cmt files (multi-file or folder)
  const handleLoadCmtFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setBusy(true)
    setError('')
    setNotice('')
    const loaded: LoadedGroup[] = []
    const failed: string[] = []

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.cmt') && !file.name.toLowerCase().endsWith('.json')) continue
      try {
        const doc = await importWorkflowFile(file, '', true)
        if (doc.kind === 'thesis-comment') {
          const comment = doc.data as ThesisComment
          const agreedCount = comment.Conclusion.filter((s) => s.Agree_to_defense?.trim().toLowerCase() === 'x').length
          loaded.push({
            fileName: file.name,
            comment,
            agreedCount,
          })
        }
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    setBusy(false)
    if (loaded.length === 0 && failed.length > 0) {
      setError(`Could not load files:\n${failed.join('\n')}`)
      return
    }

    setGroups(loaded)
    if (loaded.length > 0) {
      setSelectedIndex(0)
      setNotice(`Loaded ${loaded.length} thesis group(s).`)
    }
  }

  // The department master criteria ship inside the app bundle, so the council never picks a
  // .master file. The bundled bytes go through the same legacy codec as any other import.
  const loadCriteria = useCallback(async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const doc = await importWorkflowFile(file, '')
      if (doc.kind !== 'final-thesis-grading-items') {
        setError('The bundled master criteria decoded to an unexpected document kind.')
        return
      }
      const items = (doc.data as { items: FinalThesisGradingItem[] }).items
      setCriteria(items)
      setCriteriaName(file.name)
      setNotice(`Loaded criteria (${items.length} rules) from ${file.name}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the bundled master criteria.')
    } finally {
      setBusy(false)
    }
  }, [])

  // The ref guard keeps React StrictMode's double effect invocation from fetching it twice.
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (autoLoaded.current) return
    autoLoaded.current = true
    void loadBundledMasterCriteriaFile()
      .then(loadCriteria)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to read the bundled master criteria.')
      })
  }, [loadCriteria])

  // Open existing .tef file directly
  const handleOpenTef = async (file: File | undefined, readOnly: boolean, passwordToUse = '') => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const doc = await importWorkflowFile(file, passwordToUse, readOnly)
      if (doc.kind !== 'defense-grading') {
        setError('Selected file is not a defense evaluation (.tef).')
        return
      }
      setShowTefPasswordPrompt(false)
      setPendingTefFile(null)
      setTefPassword('')
      onStartDefense(doc as CanonicalDocument<DefenseGrading>, readOnly)
    } catch (err) {
      if (err instanceof PasswordRequiredError) {
        setPendingTefFile(file)
        setShowTefPasswordPrompt(true)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to open .tef file.')
      }
    } finally {
      setBusy(false)
    }
  }

  const selectedGroup = selectedIndex !== null ? groups[selectedIndex] : null

  // Available subject codes in criteria matching current group
  const availableSubjectsInCriteria = useMemo(() => {
    if (!criteria || !selectedGroup) return []
    const subjectPrefix = selectedGroup.comment.SubjectCode.trim().toUpperCase()
    const matches = Array.from(
      new Set(
        criteria
          .filter((item) => item.SubjectCode.trim().toUpperCase().includes(subjectPrefix))
          .map((item) => item.SubjectCode.trim().toUpperCase()),
      ),
    )
    return matches
  }, [criteria, selectedGroup])

  const effectiveSubjectCode =
    selectedSubjectCode ||
    (availableSubjectsInCriteria.length > 0
      ? availableSubjectsInCriteria[0]
      : selectedGroup?.comment.SubjectCode.trim().toUpperCase() || '')

  const matchingCriteria = useMemo(() => {
    if (!criteria || !effectiveSubjectCode) return []
    return criteriaForSubject(criteria, effectiveSubjectCode)
  }, [criteria, effectiveSubjectCode])

  const handleStartGrading = () => {
    if (!selectedGroup) {
      setError('Please select a thesis group.')
      return
    }
    const cleanEvaluator = evaluator.trim()
    if (!cleanEvaluator) {
      setError('Evaluator full name is required.')
      return
    }
    if (!isPlainEvaluatorName(cleanEvaluator)) {
      setError('Evaluator full name cannot contain accents or non-alphabetic characters (A-Z, a-z and spaces only).')
      return
    }
    if (!criteria || criteria.length === 0) {
      setError('Please choose a master criteria (.master) file before grading.')
      return
    }
    if (matchingCriteria.length === 0) {
      setError(`No criteria found for subject code “${effectiveSubjectCode}”.`)
      return
    }

    const modifiedComment: ThesisComment = {
      ...selectedGroup.comment,
      SubjectCode: effectiveSubjectCode,
    }

    const result = defenseFromComment(modifiedComment, criteria, cleanEvaluator)
    if ('error' in result) {
      setError(result.error)
      return
    }

    if (password) {
      result.Password = password
    }

    const now = new Date()
    const dateStamp = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`
    const doc: CanonicalDocument<DefenseGrading> = {
      format: 'fugrade.canonical',
      schemaVersion: 1,
      kind: 'defense-grading',
      metadata: {
        fileName: `${cleanEvaluator.replace(/\s+/g, '_')}_${effectiveSubjectCode}_${result.GradeStudents[0]?.Roll || 'GROUP'}_${dateStamp}_${result.Supervisor}.tef`,
        sourceFormat: 'tef',
        importedAt: new Date().toISOString(),
      },
      data: result,
    }

    // Grade each group in its own tab so a council member can hold several sheets open at once.
    // A blocked popup must not cost the sheet, so fall back to this tab.
    if (!openDefenseInNewTab(doc)) onStartDefense(doc, false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-purple-600 text-white">
            <Award size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Defense Council Desk (Hội đồng chấm bảo vệ)</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSummary}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users size={16} /> Summary Results
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>{notice}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left column: Group list table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thesis Defense Groups ({groups.length})</h3>
              <p className="text-xs text-slate-500">Select a group below to begin evaluation</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
                <Upload size={14} /> {busy ? 'Reading…' : 'Load .cmt Files'}
                <input
                  type="file"
                  multiple
                  accept=".cmt,.json"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => void handleLoadCmtFiles(e.target.files)}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                <FolderOpen size={14} /> Choose Folder
                <input
                  type="file"
                  accept=".cmt,.json"
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  disabled={busy}
                  onChange={(e) => void handleLoadCmtFiles(e.target.files)}
                />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Vietnamese Title</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                      No thesis comment (.cmt) files loaded. Click “Load .cmt Files” or “Choose Folder” to import groups.
                    </td>
                  </tr>
                ) : (
                  groups.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <tr
                        key={item.fileName + idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50 font-medium text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold">{item.comment.SubjectCode}</td>
                        <td className="px-4 py-3">{item.comment.ClassName}</td>
                        <td className="px-4 py-3">{item.comment.Teacher}</td>
                        <td className="max-w-xs truncate px-4 py-3" title={item.comment.TitleVN}>
                          {item.comment.TitleVN || item.comment.TitleEN || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {item.agreedCount}/{item.comment.Conclusion.length} agreed
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight size={15} className={isSelected ? 'text-blue-600' : 'text-slate-300'} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Evaluation setup */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Evaluator & Setup</h3>
            <p className="mt-0.5 text-xs text-slate-500">Configure council member details before opening the grid.</p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Evaluator Full Name (no accents)
                </span>
                <input
                  type="text"
                  value={evaluator}
                  onChange={(e) => setEvaluator(e.target.value)}
                  placeholder="e.g. Nguyen Van An"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Required by legacy format: letters and spaces only, no diacritics.
                </span>
              </label>

              <div className="block">
                <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Master Criteria
                </span>
                <span className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-600">
                  <span className="truncate">{criteriaName || 'Loading bundled criteria…'}</span>
                  {busy ? (
                    <Upload size={14} className="shrink-0 animate-pulse text-slate-400" />
                  ) : (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  )}
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  {criteria
                    ? `${criteria.length} criteria bundled with the app. To grade a different major, open its .master from the Master criteria screen.`
                    : 'Bundled with the app, no file needed.'}
                </span>
              </div>

              {availableSubjectsInCriteria.length > 1 ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    Select Subject Code (FrmChooseSujectCode)
                  </span>
                  <select
                    value={effectiveSubjectCode}
                    onChange={(e) => setSelectedSubjectCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus-visible:border-blue-500"
                  >
                    {availableSubjectsInCriteria.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedGroup ? (
                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1 border border-slate-100">
                  <p className="font-semibold text-slate-700">Selected Group:</p>
                  <p className="text-slate-600 truncate">
                    <strong>{selectedGroup.comment.SubjectCode}</strong> · {selectedGroup.comment.ClassName}
                  </p>
                  <p className="text-slate-500 truncate">{selectedGroup.comment.TitleVN || selectedGroup.comment.TitleEN}</p>
                  <p className="text-slate-500">
                    Supervisor: {selectedGroup.comment.Teacher} · {matchingCriteria.length} matching criteria
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleStartGrading}
                disabled={!selectedGroup || !criteria || !evaluator}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Award size={16} /> Grade Selected Group
              </button>
            </div>
          </div>

          {/* Quick open existing .tef */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Open Existing .tef Evaluation</h4>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Open an already saved defense file to continue editing or view in read-only mode.
            </p>
            <div className="mt-3 flex gap-2">
              <label className="flex-1 cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-200">
                Open to Edit
                <input
                  type="file"
                  accept=".tef"
                  className="hidden"
                  onChange={(e) => void handleOpenTef(e.target.files?.[0], false)}
                />
              </label>
              <label className="flex-1 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Open Read-Only
                <input
                  type="file"
                  accept=".tef"
                  className="hidden"
                  onChange={(e) => void handleOpenTef(e.target.files?.[0], true)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {showTefPasswordPrompt && pendingTefFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">Password Required</h3>
            <p className="mt-1 text-xs text-slate-500">
              {pendingTefFile.name} is password protected. Enter password to edit or open read-only.
            </p>
            <input
              type="password"
              value={tefPassword}
              autoFocus
              onChange={(e) => setTefPassword(e.target.value)}
              placeholder="Enter password"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleOpenTef(pendingTefFile, false, tefPassword)}
                disabled={!tefPassword || busy}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                Unlock to Edit
              </button>
              <button
                type="button"
                onClick={() => void handleOpenTef(pendingTefFile, true, '')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Open Read-Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTefPasswordPrompt(false)
                  setPendingTefFile(null)
                  setTefPassword('')
                }}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
