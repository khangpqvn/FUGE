# UI/UX Review — FUGE Grade Desk Components

**Date:** 2026-09-26  
**Scope:** All 9 components in `src/components/` + `App.tsx` start screen  
**Stack:** React 18 · TypeScript · Tailwind CSS v4 · Lucide icons  
**Product type:** Internal academic grading tool (enterprise/productivity)

---

## Executive Summary

The codebase is structurally clean — consistent naming, sensible layout, good use of `form-controls.tsx` shared primitives. The main UX gaps fall into three buckets: **accessibility holes** (missing keyboard trapping, ARIA landmarks, escape-key handling on modals), **style duplication** (no shared table, modal, or button components), and **missing feedback patterns** (no loading skeletons, no confirmation on destructive table operations, no dark mode). None are blockers, but several are CRITICAL per WCAG.

---

## §1 Accessibility (CRITICAL)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| A1 | `keyboard-nav` | `password-modal.tsx`, `defense-council-desk.tsx` (L467) | Modals lack focus trapping. Tab escapes the modal into the background. | CRITICAL |
| A2 | `escape-routes` | `password-modal.tsx`, `defense-council-desk.tsx` (L467) | No Escape key handler to dismiss modals. Only the X button works. | HIGH |
| A3 | `aria-labels` | `defense-council-desk.tsx` L245 | Close button (X icon) has no `aria-label`. Same at L57 in `password-modal.tsx`. | HIGH |
| A4 | `heading-hierarchy` | `App.tsx` L464 | Start screen uses `<h1>` for "FUGE Grade Desk", but document view also has `<h1>` at L293. No `<main>` landmark wraps the start screen. | MEDIUM |
| A5 | `form-labels` | `grading-sheet-panel.tsx` L322–328 | Comment `<input>` uses only `placeholder`, no `aria-label`. Same for Note inputs in `thesis-comment-panel.tsx` L155. | HIGH |
| A6 | `color-not-only` | `defense-grading-panel.tsx` L122 | "disagree to defense" is communicated only by amber text color — no icon or prefix distinguishes it from the normal state. | MEDIUM |
| A7 | `skip-links` | `App.tsx` | No skip-to-main-content link. Minor for an internal tool but straightforward to add. | LOW |
| A8 | `reduced-motion` | All | No `prefers-reduced-motion` media query. The `active:scale-[.99]` on the start screen button and `transition` classes throughout should respect this. | MEDIUM |

### Recommendations

1. **Focus trap for modals.** Use a lightweight focus-trap hook or `dialog` element. Intercept Escape to call `onClose`.
2. **Add `aria-label` to every icon-only button.** The close buttons, the Eraser "clear" button in grading-sheet-panel (L177), and the Trash2 delete buttons all need labels. Some already have them (good), but several are missing.
3. **Add `aria-label` to inline inputs.** The comment and note fields in tables should follow the pattern already used by `MarkInput` in `defense-grading-panel.tsx` (which does provide `aria-label` — good).

---

## §2 Touch & Interaction (CRITICAL)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| T1 | `touch-target-size` | `criteria-panel.tsx` L123–132 | Trash2 delete button is only `p-1` (~28×28px). Below 44px minimum. Same in `thesis-comment-panel.tsx` L170–178. | HIGH |
| T2 | `loading-buttons` | `defense-council-desk.tsx` L425–432 | "Grade Selected Group" button disables but shows no spinner during processing. The `busy` state isn't checked on that button. | MEDIUM |
| T3 | `cursor-pointer` | Multiple | Table rows in `defense-council-desk.tsx` have `cursor-pointer` (good), but file-upload `<label>` elements have `cursor-pointer` only sometimes. The "Choose Folder" label at L282 has it; consistent. | OK |
| T4 | `hover-vs-tap` | All table rows | Inline edit cells rely on hover border appearance (`hover:border-slate-300`). On touch devices the affordance is invisible until tap. Consider adding a subtle persistent border or background. | LOW |

---

## §3 Performance (HIGH)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| P1 | `font-loading` | `styles.css` L1 | Google Fonts loaded via `@import url(...)` in CSS — render-blocking. Use `<link rel="preload">` in `index.html` with `font-display: swap` (already set in the URL). | MEDIUM |
| P2 | `virtualize-lists` | `grading-sheet-panel.tsx`, `criteria-panel.tsx` | Tables render all rows. For 50+ students or 100+ criteria items, consider `react-window` or `@tanstack/virtual`. Not urgent given typical class sizes (6–60 students). | LOW |
| P3 | `content-jumping` | `defense-council-desk.tsx` | When criteria load asynchronously (L100–108), the "Master Criteria" display box appears/changes. No skeleton or reserved space. | LOW |

---

## §4 Style Selection (HIGH)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| S1 | `consistency` | Multiple | Style is internally consistent: rounded-2xl cards, slate palette, blue primary, emerald success, amber warning, red error. Good. | OK |
| S2 | `no-emoji-icons` | All | Lucide icons throughout. No emoji as icons. Good. | OK |
| S3 | `elevation-consistent` | Multiple | Cards use `shadow-sm` consistently. Modal overlays use `shadow-xl`. Consistent elevation hierarchy. | OK |
| S4 | `dark-mode-pairing` | All | No dark mode. All colors are hardcoded light-theme values. Not a functional problem for an internal tool, but worth noting as a gap. | LOW |
| S5 | `icon-style-consistent` | All | All icons from Lucide with consistent stroke width. Good. | OK |

---

## §5 Layout & Responsive (HIGH)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| L1 | `container-width` | `App.tsx` L355 | `max-w-[110rem]` (1760px) is very wide. Content can feel sparse on ultrawide monitors but it's acceptable for data-dense grading tables. | OK |
| L2 | `horizontal-scroll` | Multiple tables | Tables use `overflow-x-auto` wrapper — correct approach for wide data tables. | OK |
| L3 | `mobile-first` | `grading-sheet-panel.tsx` L120 | The two-column layout (`lg:grid-cols-[18rem_minmax(0,1fr)]`) stacks on mobile. Good. | OK |
| L4 | `viewport-units` | `App.tsx` L283 | Uses `min-h-screen` which maps to `100vh`. On mobile, `min-h-dvh` is more reliable (handles dynamic viewport). | LOW |

---

## §6 Typography & Color (MEDIUM)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| C1 | `color-semantic` | All | Colors are raw Tailwind tokens (`bg-blue-600`, `text-slate-500`) repeated inline across all files. No semantic color tokens (e.g., `--color-primary`, `--color-surface`). Changing the brand color requires updating every file. | MEDIUM |
| C2 | `font-scale` | All | Text sizes used: `text-[10px]`, `text-[11px]`, `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-2xl` (24px). The `text-[10px]` and `text-[11px]` arbitrary values bypass the type scale and risk readability issues. | MEDIUM |
| C3 | `number-tabular` | `grading-sheet-panel.tsx`, `defense-grading-panel.tsx` | Mark/grade number inputs are `text-center` but don't use `font-variant-numeric: tabular-nums`. Columns may shift as values change. The `font-mono` on Roll numbers is good. | LOW |
| C4 | `weight-hierarchy` | All | Weight usage is clean: `font-extrabold` for page title, `font-bold` for section headings, `font-semibold` for labels and buttons, `font-medium` for secondary actions. Good hierarchy. | OK |
| C5 | `contrast-readability` | All | `text-slate-400` on `bg-white` is approximately 3.8:1 contrast — slightly below the 4.5:1 WCAG AA threshold. Used for hint text, table row numbers, and placeholder-style elements. Consider `text-slate-500` (5.3:1). | MEDIUM |

---

## §7 Animation (MEDIUM)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| N1 | `modal-motion` | `password-modal.tsx`, `defense-council-desk.tsx` | Modals appear instantly (no enter/exit animation). A fade + scale transition would provide spatial context. | LOW |
| N2 | `state-transition` | `summary-results-panel.tsx` L71–94 | Tab switching between Summary and Statistics is instant — no crossfade or slide. | LOW |

---

## §8 Forms & Feedback (MEDIUM)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| F1 | `confirmation-dialogs` | `criteria-panel.tsx` L127 | Deleting a criteria row has no confirmation. Uses `window.confirm` in other places (password removal, document close) — inconsistent. | MEDIUM |
| F2 | `confirmation-dialogs` | `thesis-comment-panel.tsx` L173 | Removing a student from the conclusion table also lacks confirmation. | MEDIUM |
| F3 | `error-placement` | `password-modal.tsx` L114 | Error message appears between the confirm field and the submit button — correct placement. | OK |
| F4 | `disabled-states` | `App.tsx` L328–333 | Disabled export button uses `disabled:bg-slate-300` and `disabled:cursor-not-allowed`. Missing `disabled:text-slate-500` — white text on slate-300 is low contrast. | MEDIUM |
| F5 | `input-labels` | `defense-council-desk.tsx` L473–480 | The .tef password prompt input has only a `placeholder` as label. The label "Password Required" is a heading, not associated with the input. | MEDIUM |
| F6 | `password-toggle` | `password-modal.tsx` | No show/hide toggle for password fields. Users can't verify what they typed. | LOW |
| F7 | `sheet-dismiss-confirm` | `password-modal.tsx` | Closing the password modal with unsaved input (partially typed password) doesn't warn. Minor since no data is lost. | LOW |
| F8 | `empty-states` | `summary-results-panel.tsx` | When no files are loaded, the panel shows the file picker but no explicit "No data" message beneath the tabs area. | LOW |

---

## §9 Navigation Patterns (HIGH)

| ID | Rule | File(s) | Finding | Severity |
|----|------|---------|---------|----------|
| V1 | `back-behavior` | `App.tsx` | Navigation is state-driven. Browser back button doesn't return to the previous view (e.g., from document editor back to start screen). | MEDIUM |
| V2 | `modal-escape` | `password-modal.tsx`, `defense-council-desk.tsx` | Clicking the backdrop doesn't dismiss modals. Only the X button or Cancel works. | MEDIUM |
| V3 | `nav-state-active` | `summary-results-panel.tsx` L71–94 | Tab bar properly highlights active tab with `border-blue-600`. Good. | OK |

---

## Structural Issues (DRY / Component Architecture)

These aren't UX rule violations but affect maintainability and consistency:

| ID | Finding | Impact |
|----|---------|--------|
| D1 | **No shared table component.** Six files render `<table>` with nearly identical thead/tbody patterns, each duplicating border, spacing, and hover styles. | HIGH duplication |
| D2 | **No shared modal/dialog component.** `password-modal.tsx` and the `.tef` password prompt in `defense-council-desk.tsx` duplicate the overlay pattern (`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm`). | MEDIUM duplication |
| D3 | **No shared button component.** At least 5 button variants are repeated: primary (`bg-blue-600`), secondary (`border-slate-300`), dark (`bg-slate-900`), success (`bg-emerald-600`), danger-text (`text-red-600`). | MEDIUM duplication |
| D4 | **Input styling duplicated.** `form-controls.tsx` exports `INPUT_CLASS` but at least 12 inline `<input>` elements across other files duplicate similar styling instead of importing it. | MEDIUM duplication |
| D5 | **`round()` function duplicated.** Defined identically in both `defense-grading-panel.tsx` (L234) and `criteria-panel.tsx` (L202). | LOW |

---

## Priority Action List

### Must Fix (CRITICAL / HIGH)

1. **Add focus trapping + Escape key handling to both modal overlays** (A1, A2)
2. **Add `aria-label` to all icon-only buttons** missing labels (A3, A5)
3. **Increase touch target on Trash2 delete buttons** to ≥44px (T1)
4. **Fix `text-slate-400` contrast** — upgrade to `text-slate-500` for body-adjacent text (C5)

### Should Fix (MEDIUM)

5. Add confirmation dialogs before deleting criteria rows and student conclusion rows (F1, F2)
6. Fix disabled button text contrast — add `disabled:text-slate-500` (F4)
7. Associate labels with password inputs in `.tef` password prompt (F5)
8. Add `aria-label` to the "disagree to defense" indicator, or prefix with an icon (A6)
9. Move Google Fonts to `<link rel="preload">` in `index.html` (P1)
10. Define semantic color tokens in `@theme` instead of raw Tailwind colors (C1)
11. Add backdrop click dismiss for modals (V2)

### Nice to Have (LOW)

12. Add `prefers-reduced-motion` media query support (A8)
13. Add modal enter/exit animations (N1)
14. Add tab-switch crossfade (N2)
15. Use `min-h-dvh` instead of `min-h-screen` (L4)
16. Add password show/hide toggle (F6)
17. Extract shared table, modal, and button components (D1–D4)
18. Consider dark mode support (S4)
19. Eliminate arbitrary `text-[10px]` / `text-[11px]` sizes (C2)
20. Add `tabular-nums` to numeric columns (C3)

---

## What's Working Well

- **Consistent visual language** across all panels — same card style, spacing, icon set
- **Good use of `PanelSection`** as a shared layout primitive
- **`aria-label` on mark inputs** in `defense-grading-panel.tsx` and `grading-sheet-panel.tsx`
- **Proper `overflow-x-auto`** on all data tables
- **Responsive grid layouts** that stack on mobile
- **Unsaved changes warning** via `beforeunload`
- **Form validation** with `ValidationList` providing clear feedback
- **`disabled` states** on buttons during async operations
- **Empty state messages** in tables ("No student matches this search", etc.)
