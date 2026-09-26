import { useEffect, useRef, useState } from 'react'
import { Award, BarChart3, FileJson, FileText, FolderOpen, Lock, LockOpen, MessageSquare, Save, Table2, X } from 'lucide-react'
import type { DefenseGrading, DocumentKind, FinalThesisGradingItem, SubjectClassGrade, TeacherGrade, ThesisComment, WorkflowDocument } from './types/models'
import { canonicalJsonBlob } from './lib/canonical-json'
import { validatePayload } from './lib/document-validation'
import { PasswordRequiredError, importWorkflowFile } from './lib/file-import'
import { blankCriteria, blankThesisComment } from './lib/blank-documents'
import { exportLegacyBinary, legacyExtensionForKind } from './lib/legacy-codec'
import { downloadBlob, encryptLegacyFg } from './lib/legacy-fg'
import { takePendingDefense } from './lib/pending-defense-handoff'
import { GradingSheetPanel } from './components/grading-sheet-panel'
import { ThesisCommentPanel } from './components/thesis-comment-panel'
import { DefenseGradingPanel } from './components/defense-grading-panel'
import { CriteriaPanel } from './components/criteria-panel'
import { StartDefensePanel } from './components/start-defense-panel'
import { SummaryResultsPanel } from './components/summary-results-panel'
import { PasswordModal } from './components/password-modal'
import { DefenseCouncilDesk } from './components/defense-council-desk'

const KIND_LABEL = {
  'teacher-grade': 'Grading sheet',
  'thesis-comment': 'Thesis comment',
  'defense-grading': 'Defense evaluation',
  'final-thesis-grading-items': 'Master criteria',
} as const

const KIND_ICON = {
  'teacher-grade': Table2,
  'thesis-comment': MessageSquare,
  'defense-grading': Award,
  'final-thesis-grading-items': FileText,
} as const

/**
 * Legacy .fg, .cmt and .tef documents all carry a Password field, and legacy FuGrade refuses to
 * save them unprotected, so an export of these kinds is blocked until a password is set. Master
 * criteria (.master) have no such field and stay exportable.
 */
const PASSWORD_REQUIRED_KINDS: DocumentKind[] = ['teacher-grade', 'thesis-comment', 'defense-grading']

export default function App() {
  const [document, setDocument] = useState<WorkflowDocument | null>(null)
  const [password, setPassword] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [showCouncilDesk, setShowCouncilDesk] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  // A sheet opened by "Grade Selected Group" arrives here through the URL, since a new tab starts
  // with no document. The ref guard matters: without it StrictMode's second invocation would read
  // the handoff key after takePendingDefense already removed it, and blank the sheet.
  const handoffRead = useRef(false)
  useEffect(() => {
    if (handoffRead.current) return
    handoffRead.current = true
    const pending = takePendingDefense()
    if (!pending) return
    setDocument(pending)
    setReadOnly(false)
    setDirty(true)
    setNotice('Defense sheet opened in a new tab. Marks are unsaved until you export.')
  }, [])

  const openFile = async (file: File | undefined, suppliedPassword = '', asReadOnly = false) => {
    if (!file) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (dirty && !window.confirm('Discard unsaved changes and open another document?')) return
      const doc = await importWorkflowFile(file, suppliedPassword, asReadOnly)
      setDocument(doc)
      setReadOnly(asReadOnly)
      setDirty(false)
      setPendingFile(null)
      setPassword('')
      setShowCouncilDesk(false)
      setShowSummary(false)
      if (asReadOnly) {
        setNotice('Document opened in READ ONLY mode.')
      }
    } catch (cause) {
      if (cause instanceof PasswordRequiredError) {
        setPendingFile(file)
        setError(cause.message)
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not open this file.')
      }
    } finally {
      setBusy(false)
    }
  }

  const updateData = (data: TeacherGrade | ThesisComment | DefenseGrading | { items: FinalThesisGradingItem[] }) => {
    if (!document || readOnly) return
    setDocument({ ...document, data } as WorkflowDocument)
    setDirty(true)
  }

  const handlePasswordSave = (newHash: string) => {
    if (!document) return
    const currentData = document.data as Record<string, unknown>
    if ('Password' in currentData) {
      updateData({ ...currentData, Password: newHash } as unknown as TeacherGrade)
      setNotice(newHash ? 'Document password updated.' : 'Document password removed.')
    }
  }

  const createThesisCommentFromGroup = (group: SubjectClassGrade) => {
    if (dirty && !window.confirm('Discard unsaved changes and create a thesis comment?')) return
    const sheet = document?.data as TeacherGrade
    const comment: ThesisComment = {
      Teacher: sheet?.Login || '',
      DT: new Date().toISOString(),
      SubjectCode: group.Subject || '',
      ClassName: group.Class || '',
      Semester: sheet?.Semester || '',
      Password: '',
      TitleVN: '',
      TitleEN: '',
      Content: '',
      Form: '',
      Attitude: '',
      Achievement: '',
      Limitation: '',
      Conclusion: group.Students.map((s) => ({
        Roll: s.Roll,
        Name: s.Name,
        Agree_to_defense: null,
        Revised_for_the_second_defense: null,
        Disagree_to_defense: null,
        Note: '',
      })),
    }
    const newDoc: WorkflowDocument = {
      format: 'fugrade.canonical',
      schemaVersion: 1,
      kind: 'thesis-comment',
      metadata: {
        fileName: `${sheet?.Login || 'teacher'}_${group.Subject}_${group.Class}.cmt`,
        sourceFormat: 'cmt',
        importedAt: new Date().toISOString(),
      },
      data: comment,
    }
    setDocument(newDoc)
    setReadOnly(false)
    setDirty(true)
    setNotice(`Created thesis comment draft for ${group.Subject}/${group.Class} (${group.Students.length} students).`)
  }

  const exportJson = () => {
    if (!document) return
    setError('')
    downloadBlob(canonicalJsonBlob(document), `${baseName(document.metadata.fileName)}.fuge.json`)
    setDirty(false)
    setNotice('Canonical JSON downloaded.')
  }

  const exportLegacy = async () => {
    if (!document) return
    if (readOnly) {
      setError('Cannot export changes while in READ ONLY mode.')
      return
    }
    const problems = validatePayload(document.kind, document.data)
    if (problems.length) {
      setError(`Fix ${problems.length} validation issue(s) before exporting a legacy file.`)
      return
    }
    const docData = document.data as Record<string, unknown>
    if (PASSWORD_REQUIRED_KINDS.includes(document.kind) && !String(docData.Password ?? '').trim()) {
      setError('This legacy file has no password set. Set a password before exporting.')
      setShowPasswordModal(true)
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (document.kind === 'teacher-grade') {
        const blob = await encryptLegacyFg(document.data as TeacherGrade)
        downloadBlob(blob, `${baseName(document.metadata.fileName)}.fg`)
        setDirty(false)
        setNotice('Legacy .fg downloaded. Open it in FuGrade to confirm the round trip.')
      } else {
        const blob = await exportLegacyBinary(document)
        downloadBlob(blob, `${baseName(document.metadata.fileName)}${legacyExtensionForKind(document.kind)}`)
        setDirty(false)
        setNotice(`Legacy ${legacyExtensionForKind(document.kind)} downloaded from the converter.`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Legacy export failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!document) {
    if (showCouncilDesk) {
      return (
        <div className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6">
          <DefenseCouncilDesk
            onStartDefense={(doc, ro) => {
              setDocument(doc)
              setReadOnly(Boolean(ro))
              setShowCouncilDesk(false)
              setDirty(!ro)
            }}
            onOpenSummary={() => {
              setShowCouncilDesk(false)
              setShowSummary(true)
            }}
            onClose={() => setShowCouncilDesk(false)}
          />
        </div>
      )
    }

    if (showSummary) {
      return (
        <div className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6">
          <SummaryResultsPanel onClose={() => setShowSummary(false)} />
        </div>
      )
    }

    return (
      <StartScreen
        busy={busy}
        error={error}
        password={password}
        pendingFileName={pendingFile?.name ?? null}
        onPassword={setPassword}
        onFile={(file) => {
          setPendingFile(null)
          setPassword('')
          void openFile(file)
        }}
        onUnlock={() => void openFile(pendingFile ?? undefined, password, false)}
        onUnlockReadOnly={() => void openFile(pendingFile ?? undefined, '', true)}
        onCancelUnlock={() => {
          setPendingFile(null)
          setPassword('')
          setError('')
        }}
        onBlank={(kind) => {
          setError('')
          setNotice('')
          setPendingFile(null)
          setDirty(false)
          setReadOnly(false)
          setDocument(kind === 'thesis-comment' ? blankThesisComment() : blankCriteria())
        }}
        onOpenCouncilDesk={() => setShowCouncilDesk(true)}
        onOpenSummary={() => setShowSummary(true)}
      />
    )
  }

  const Icon = KIND_ICON[document.kind]
  const currentPasswordHash =
    document && 'Password' in (document.data as Record<string, unknown>)
      ? (((document.data as Record<string, unknown>).Password as string) ?? '')
      : null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-bold text-slate-900">
                  {KIND_LABEL[document.kind]}
                  <span className="ml-2 font-medium text-slate-500">{describeDocument(document)}</span>
                </h1>
                {readOnly ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase text-amber-800">
                    Read Only
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-slate-500">
                {document.metadata.fileName} · source {document.metadata.sourceFormat} · schema v{document.schemaVersion}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentPasswordHash !== null ? (
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                  currentPasswordHash
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
                title={
                  currentPasswordHash ? 'Password protected (click to manage)' : 'No password set (click to protect)'
                }
              >
                {currentPasswordHash ? <Lock size={14} /> : <LockOpen size={14} />}
                {currentPasswordHash ? 'Password set' : 'Set password'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={exportLegacy}
              disabled={busy || readOnly}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save size={16} />{' '}
              {busy ? 'Working…' : `Export ${document.kind === 'teacher-grade' ? '.fg' : legacyExtensionForKind(document.kind)}`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (dirty && !window.confirm('Discard unsaved changes and close this document?')) return
                setDocument(null)
                setDirty(false)
                setReadOnly(false)
                setNotice('')
                setError('')
              }}
              aria-label="Close document"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {error ? <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">{error}</p> : null}
        {notice ? <p className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 sm:px-6">{notice}</p> : null}
      </header>

      <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 py-6 sm:px-6">
        {showCouncilDesk ? (
          <DefenseCouncilDesk
            onStartDefense={(doc, ro) => {
              setDocument(doc)
              setReadOnly(Boolean(ro))
              setShowCouncilDesk(false)
              setDirty(!ro)
            }}
            onOpenSummary={() => {
              setShowCouncilDesk(false)
              setShowSummary(true)
            }}
            onClose={() => setShowCouncilDesk(false)}
          />
        ) : showSummary ? (
          <SummaryResultsPanel onClose={() => setShowSummary(false)} />
        ) : null}

        {!showCouncilDesk && !showSummary && document.kind === 'teacher-grade' ? (
          <GradingSheetPanel
            sheet={document.data as TeacherGrade}
            onChange={updateData}
            onCreateThesisComment={createThesisCommentFromGroup}
          />
        ) : null}
        {!showCouncilDesk && !showSummary && document.kind === 'thesis-comment' ? (
          <div className="space-y-5">
            <ThesisCommentPanel comment={document.data as ThesisComment} onChange={updateData} />
            <StartDefensePanel
              comment={document.data as ThesisComment}
              onStart={(result) => {
                if ('error' in result) return
                setError('')
                setNotice('Defense evaluation built from this thesis comment and the master criteria.')
                setDirty(true)
                setReadOnly(false)
                setDocument({
                  format: 'fugrade.canonical',
                  schemaVersion: 1,
                  kind: 'defense-grading',
                  metadata: {
                    fileName: `${baseName(document.metadata.fileName)}.tef`,
                    sourceFormat: 'json',
                    importedAt: new Date().toISOString(),
                  },
                  data: result,
                })
              }}
            />
          </div>
        ) : null}
        {!showCouncilDesk && !showSummary && document.kind === 'defense-grading' ? (
          <DefenseGradingPanel defense={document.data as DefenseGrading} readOnly={readOnly} onChange={updateData} />
        ) : null}
        {!showCouncilDesk && !showSummary && document.kind === 'final-thesis-grading-items' ? (
          <CriteriaPanel
            items={(document.data as { items: FinalThesisGradingItem[] }).items}
            onChange={(items) => updateData({ items })}
          />
        ) : null}
      </main>

      <PasswordModal
        isOpen={showPasswordModal}
        currentPasswordHash={currentPasswordHash ?? ''}
        onSave={handlePasswordSave}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  )
}

function StartScreen({
  busy,
  error,
  password,
  pendingFileName,
  onPassword,
  onFile,
  onUnlock,
  onUnlockReadOnly,
  onCancelUnlock,
  onBlank,
  onOpenCouncilDesk,
  onOpenSummary,
}: {
  busy: boolean
  error: string
  password: string
  pendingFileName: string | null
  onPassword: (value: string) => void
  onFile: (file: File | undefined) => void
  onUnlock: () => void
  onUnlockReadOnly?: () => void
  onCancelUnlock: () => void
  onBlank: (kind: 'thesis-comment' | 'final-thesis-grading-items') => void
  onOpenCouncilDesk: () => void
  onOpenSummary: () => void
}) {
  const isTefFile = Boolean(pendingFileName?.toLowerCase().endsWith('.tef'))

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <FolderOpen size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">FUGE Grade Desk</h1>

          {pendingFileName ? (
            <form
              className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              onSubmit={(event) => {
                event.preventDefault()
                onUnlock()
              }}
            >
              <p className="text-sm font-semibold text-slate-700">
                <Lock size={14} className="mr-1 inline" />
                {pendingFileName} is password protected
              </p>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">FuGrade password</span>
                <input
                  type="password"
                  value={password}
                  autoFocus
                  autoComplete="off"
                  onChange={(event) => onPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy || password === ''}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Lock size={15} /> {busy ? 'Unlocking…' : 'Unlock'}
                </button>
                {isTefFile && onUnlockReadOnly ? (
                  <button
                    type="button"
                    onClick={onUnlockReadOnly}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Open Read-Only
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onCancelUnlock}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[.99]">
              <FolderOpen size={18} />
              {busy ? 'Opening…' : 'Open .fg, .cmt, .tef (For edit)'}
              <input
                type="file"
                accept=".fg,.cmt,.tef"
                className="hidden"
                disabled={busy}
                onChange={(event) => onFile(event.target.files?.[0])}
              />
            </label>
          )}

          {error ? (
            <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${pendingFileName ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'}`}>{error}</p>
          ) : null}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Thesis zone</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenCouncilDesk}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800 transition hover:bg-purple-100"
              >
                <Award size={16} /> Defense council desk
              </button>
              <button
                type="button"
                onClick={onOpenSummary}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <BarChart3 size={16} /> Summary results
              </button>
              </div>
          </div>
        </div>

        <p className="px-2 text-xs leading-relaxed text-slate-500">
          Legacy files are decoded locally with a bounded fixed-schema codec. Keep original files as backups before exporting edited copies.
        </p>
      </div>
    </div>
  )
}

/** Restores the owner/context line the legacy forms always showed in their title bars. */
function describeDocument(document: WorkflowDocument) {
  if (document.kind === 'teacher-grade') {
    const sheet = document.data as TeacherGrade
    return [sheet.Login, sheet.Semester].filter(Boolean).join(' · ')
  }
  if (document.kind === 'thesis-comment') {
    const comment = document.data as ThesisComment
    return [comment.Teacher, [comment.SubjectCode, comment.ClassName].filter(Boolean).join('/')].filter(Boolean).join(' · ')
  }
  if (document.kind === 'defense-grading') {
    const defense = document.data as DefenseGrading
    return [defense.GradedTeacher, [defense.SubjectCode, defense.ClassName].filter(Boolean).join('/')].filter(Boolean).join(' · ')
  }
  const items = (document.data as { items: FinalThesisGradingItem[] }).items
  const subjects = new Set(items.map((item) => item.SubjectCode.trim().toUpperCase()).filter(Boolean))
  return `${items.length} criteria · ${subjects.size} subject(s)`
}

function baseName(fileName: string) {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? fileName
  const sanitized = withoutPath.replace(/[^\w\-. ]+/g, '_')
  const dot = sanitized.lastIndexOf('.')
  return (dot > 0 ? sanitized.slice(0, dot) : sanitized) || 'fugrade-document'
}
