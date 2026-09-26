import { useState } from 'react'
import { KeyRound, Lock, ShieldCheck, Trash2, X } from 'lucide-react'
import { validatePasswordPair } from '../lib/password-compatibility'

interface Props {
  isOpen: boolean
  currentPasswordHash: string
  onSave: (newHash: string) => void
  onClose: () => void
}

export function PasswordModal({ isOpen, currentPasswordHash, onSave, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const isGuarded = Boolean(currentPasswordHash && currentPasswordHash.trim() !== '')

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const result = validatePasswordPair(password, confirmPassword)
    if ('error' in result) {
      setError(result.error ?? 'Invalid password')
      return
    }
    onSave(result.hash)
    setPassword('')
    setConfirmPassword('')
    onClose()
  }

  const handleRemove = () => {
    if (window.confirm('Remove password protection from this document?')) {
      onSave('')
      setPassword('')
      setConfirmPassword('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <KeyRound size={18} />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              {isGuarded ? 'Change Document Password' : 'Set Document Password'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Passwords are saved as legacy-compatible MD5 hashes. When opening the file in legacy FuGrade or FuGrade Web, this password will be required.
        </p>

        {isGuarded ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} /> Currently password protected
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={13} /> Remove password
            </button>
          </div>
        ) : null}

        <form onSubmit={handleApply} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {isGuarded ? 'New password' : 'Password'}
            </span>
            <input
              type="password"
              value={password}
              autoFocus
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Confirm password
            </span>
            <input
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}

          <div className="mt-5 flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!password}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Lock size={15} /> Save password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
