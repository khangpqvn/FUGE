import type { ReactNode } from 'react'

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  disabled,
  rows = 4,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  rows?: number
  required?: boolean
}) {
  const empty = required && !value.trim()
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
        {empty ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">required</span> : null}
      </span>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} resize-y leading-relaxed ${empty ? 'border-amber-300' : ''}`}
      />
    </label>
  )
}

export function PanelSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function ValidationList({ errors }: { errors: string[] }) {
  if (!errors.length) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        All legacy validation rules pass for this document.
      </p>
    )
  }
  return (
    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-semibold">{errors.length} validation issue(s) must be fixed before a legacy export.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.slice(0, 8).map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
      {errors.length > 8 ? <p className="mt-2 text-xs">…and {errors.length - 8} more.</p> : null}
    </div>
  )
}
