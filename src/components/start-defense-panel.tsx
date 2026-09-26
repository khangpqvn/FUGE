import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, Upload } from 'lucide-react'
import type { FinalThesisGradingItem, ThesisComment } from '../types/models'
import { criteriaForSubject, defenseFromComment } from '../lib/blank-documents'
import { importWorkflowFile } from '../lib/file-import'
import { loadBundledMasterCriteriaFile } from '../lib/bundled-master-criteria'
import { PanelSection } from './form-controls'

interface Props {
  comment: ThesisComment
  onStart: (defense: ReturnType<typeof defenseFromComment>) => void
}

/** Mirrors legacy FrmDefenseGrading: pick master criteria, name the evaluator, open the form. */
export function StartDefensePanel({ comment, onStart }: Props) {
  const [criteria, setCriteria] = useState<FinalThesisGradingItem[] | null>(null)
  const [criteriaName, setCriteriaName] = useState('')
  const [evaluator, setEvaluator] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const matching = criteria ? criteriaForSubject(criteria, comment.SubjectCode) : []

  const loadCriteria = useCallback(async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const document = await importWorkflowFile(file, '')
      if (document.kind !== 'final-thesis-grading-items') {
        setError('Choose a master criteria document (.master, or its canonical JSON).')
        return
      }
      setCriteria((document.data as { items: FinalThesisGradingItem[] }).items)
      setCriteriaName(file.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that criteria file.')
    } finally {
      setBusy(false)
    }
  }, [])

  // The department master criteria ship inside the bundle, so grading starts without a file hunt.
  // The ref guard keeps React StrictMode's double effect invocation from fetching it twice.
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (autoLoaded.current) return
    autoLoaded.current = true
    void loadBundledMasterCriteriaFile()
      .then(loadCriteria)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load the bundled master criteria.')
      })
  }, [loadCriteria])

  const start = () => {
    const result = defenseFromComment(comment, criteria ?? [], evaluator)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError('')
    onStart(result)
  }

  return (
    <PanelSection
      title="Start a defense evaluation"
      description="Build the evaluation grid from this thesis comment plus a master criteria file."
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">Master criteria</span>
          <span className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
            <Upload size={15} />
            <span className="truncate">{criteriaName || (busy ? 'Reading…' : 'Choose .master')}</span>
            <input
              type="file"
              accept=".master"
              className="hidden"
              disabled={busy}
              onChange={(event) => void loadCriteria(event.target.files?.[0])}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">Evaluator full name</span>
          <input
            type="text"
            value={evaluator}
            onChange={(event) => setEvaluator(event.target.value)}
            placeholder="No accents, letters only"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
          />
        </label>

        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Award size={16} /> Open evaluation
        </button>
      </div>

      {criteria ? (
        <p className="mt-3 text-sm text-slate-500">
          {matching.length} criterion(s) match subject {comment.SubjectCode || '(empty)'} · total scale{' '}
          {Math.round(matching.reduce((sum, item) => sum + item.Scale, 0) * 100) / 100} · {comment.Conclusion.length} student(s)
        </p>
      ) : null}

      {error ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
    </PanelSection>
  )
}
