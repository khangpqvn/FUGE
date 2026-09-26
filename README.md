# FUGE Grade Desk

Web port of the legacy FuGrade WinForms grading tool. Runs 100% in the browser with zero external backend or server dependencies.

## Workflows

All five legacy documents and workflows are fully modelled, editable, and exportable:

| Workflow | Legacy file | Import | Edit | Export JSON | Export legacy |
| --- | --- | --- | --- | --- | --- |
| Grading sheet | `.fg` | in browser | yes | yes | in browser (`.fg`) |
| Thesis comment | `.cmt` | in browser | yes | yes | in browser (`.cmt`) |
| Defense evaluation | `.tef` | in browser | yes | yes | in browser (`.tef`) |
| Master criteria | `.master` | in browser | yes | yes | in browser (`.master`) |
| Defense summary | `.tef` bundle | in browser | aggregate | yes | in browser (`.xlsx`) |

Canonical `.fuge.json` files can also be re-imported directly, so a document can be edited
in more than one session without touching a legacy binary.

### 1. Grading sheet (`.fg`)

Opens an AES-encrypted JSON `.fg` file, prompting for the password only when the file
carries one. Supports subject/class selection, merging all classes when they share the same
component list, student search, comment editing, per-component mark editing, adding a
student or component, clearing every mark in a component, and pasting marks or comments.
Marks accept 0–10, a `Status` component accepts only 1 or 0, and a rejected cell reverts to
its committed value the same way the legacy grid did. Includes a direct "Write thesis comment"
action for thesis classes (≤ 6 students).

### 2. Thesis comment (`.cmt`)

Edits the supervisor evaluation: titles (Vietnamese and English), the five required narrative
sections (3.1 Content, 3.2 Form, 3.3 Attitude, 4.1 Achievement, 4.2 Limitation), and the
per-student defense conclusion, which must be exactly one of agree, revise, or disagree.

### 3. Defense evaluation (`.tef`) & Defense Council Desk

Replicates `FrmDefenseGrading`:
- Council members can batch-load thesis comment files (`.cmt`) or select a folder of groups.
- Displays a table of all candidate defense groups with agreement counts.
- Master criteria (`.master`) ship inside the app bundle and load automatically, so the council never picks a file; a different barem can still be opened from the Master criteria screen.
- Resolves subject code ambiguity (`FrmChooseSujectCode`) and requires the evaluator name (accents rejected per legacy rule).
- Opens each group's evaluation grid in a new browser tab, so a council member can hold several sheets open at once. When the browser blocks the popup, the sheet opens in the current tab instead.
- Supports opening existing `.tef` files in Edit mode or Read-Only mode.

### 4. Defense summary & Excel export (`.xlsx`)

Replicates `FrmSummarizeThesisResult`:
- Loads multiple `.tef` files or folder hierarchies.
- Validates group signatures (`Semester-Subject-Class-Rolls`).
- Computes council averages with legacy `MidpointRounding.AwayFromZero` rounded to 1 decimal place.
- Exports a 2-sheet Excel workbook (`Summary` with all teacher columns, and `Graded statistics`).

### 5. Master criteria (`.master`)

Replicates `FrmCreateFinalCPGradingItems`:
Filters criteria by subject, edits them in place, adds new ones with a case-insensitive
duplicate guard and a positive scale, and shows the total scale per subject.

## Detailed Documentation

Comprehensive documentation and architecture flowcharts are located in `docs/`:
- [`docs/workflows.md`](docs/workflows.md): Complete Mermaid sequence diagrams and flowcharts for all 5 workflows.
- [`docs/legacy-specifications.md`](docs/legacy-specifications.md): Detailed C# WinForms source specification, models, and cryptographic algorithms.
- [`docs/web-architecture-and-codec.md`](docs/web-architecture-and-codec.md): Pure TypeScript BinaryFormatter codec, Web Crypto, and Canonical JSON architecture.
- [`docs/user-guide.md`](docs/user-guide.md): Complete user guide for teachers, thesis supervisors, council members, and academic administrators.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Checks:

```bash
npm run build
npm test
```

## Local legacy binary codec

`.cmt`, `.tef`, and `.master` are legacy .NET `BinaryFormatter` streams. This app handles them
locally with a bounded fixed-schema TypeScript codec. It never executes code or resolves
arbitrary types from a file. The department master criteria ship as
`src/template/FinalThesisGradingItems.master` and are decoded through the same codec as any
picked `.master`, so there is one decode path. Canonical JSON is the session/metadata
interchange format rather than a standalone workflow.

The codec enforces file, string, collection, object-count, and nesting limits and rejects
unknown roots, members, references, and records. The writer uses fixed FuGrade schemas and
legacy assembly metadata so edited `.cmt` and `.tef` files can be checked in the original
FuGrade application. Keep original files as backups before exporting edited copies.

The local facade is `src/lib/legacy-codec.ts`. Unsupported BinaryFormatter variants fail
closed with a clear error instead of falling back to dynamic deserialization.

## Compatibility notes

A `.fg` file is Base64 text wrapping AES-CBC encrypted JSON. Import and export preserve the
legacy field names (`Version`, `Semester`, `Login`, `Password`, `SubjectClassGrades`, …),
null marks, and Vietnamese text, so a file exported here reopens in FuGrade.

The legacy AES key and MD5 password hashing exist only for file compatibility. They are not
a security mechanism for new data, and passwords are never stored in plain text.

Canonical JSON uses a versioned envelope (`format`, `schemaVersion`, `kind`, `metadata`,
`data`) and keeps the legacy field names inside `data`.

Keep the original files as backups before migrating anything. Every export is a new
download; no uploaded file is ever modified in place.

## Verified

`npm run build` and `npm test` pass (81 unit tests, including an AES round trip against the
real `khangpq3Summer2026.fg` file, BinaryFormatter decode checks on real `.cmt`, `.tef`, and
`.master` fixtures from `old/FuGrade/MasterFile/`, read-only `.tef` password bypass tests, and
an MD5 differential check across block boundaries).
