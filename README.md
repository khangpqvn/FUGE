# FUGE Grade Desk

Web port of the legacy FuGrade WinForms grading tool.

## Workflows

All four legacy documents are modelled, editable and exportable as canonical JSON:

| Workflow | Legacy file | Import | Edit | Export JSON | Export legacy |
| --- | --- | --- | --- | --- | --- |
| Grading sheet | `.fg` | in browser | yes | yes | in browser |
| Thesis comment | `.cmt` | needs converter | yes | yes | needs converter |
| Defense evaluation | `.tef` | needs converter | yes | yes | needs converter |
| Master criteria | `.master` | needs converter | yes | yes | needs converter |

Canonical `.fuge.json` files can also be re-imported directly, so a document can be edited
in more than one session without touching a legacy binary.

### Grading sheet

Opens an AES-encrypted JSON `.fg` file, prompting for the password only when the file
carries one. Supports subject/class selection, merging all classes when they share the same
component list, student search, comment editing, per-component mark editing, adding a
student or component, clearing every mark in a component, and pasting marks or comments.
Marks accept 0–10, a `Status` component accepts only 1 or 0, and a rejected cell reverts to
its committed value the same way the legacy grid did.

### Thesis comment

Edits the supervisor evaluation: titles, the five required narrative sections, and the
per-student defense conclusion, which must be exactly one of agree, revise, or disagree.

### Defense evaluation

A defense sheet is either opened from an existing `.tef` or built the way the legacy tool
built it: from an open thesis comment, choose a master criteria file and name the evaluator,
and the grid is generated for every student in that thesis group using the criteria whose
subject code matches. The evaluator name rejects accents and non-letters, because the legacy
`.tef` filename embedded it verbatim.

Editing gives a group mark and one mark per student per criterion, each capped at that
criterion's scale, with running totals, a group note, and a copy-group-mark action. The
supervisor comment embedded in a `.tef` file is shown read-only.

### Master criteria

Filters criteria by subject, edits them in place, adds new ones with a case-insensitive
duplicate guard and a positive scale, and shows the total scale per subject.

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

## The legacy binary converter

`.cmt`, `.tef` and `.master` are .NET `BinaryFormatter` streams. Deserializing them is a
remote-code-execution risk and the format is not implementable in a browser, so this app
never parses or writes them directly. It calls an isolated converter instead:

```bash
VITE_LEGACY_BRIDGE_URL=http://127.0.0.1:5099 npm run dev
```

The converter must expose two routes and run on a .NET runtime that can read the original
`FuGrade` types:

- `POST /api/legacy/import?kind=<thesis-comment|defense-grading|final-thesis-grading-items>`
  takes the uploaded file as multipart `file` and returns one canonical JSON document.
- `POST /api/legacy/export?kind=<...>` takes a canonical JSON document and returns the
  legacy binary file.

It must deserialize only through an allowlist of the legacy root types
(`FuGrade.ThesisComment`, `FuGrade.DefenseGrading`, `List<FuGrade.FinalThesisGradingItem>`),
run in its own low-privilege process with size and time limits, and never resolve a type or
path supplied by the client. This app validates whatever the converter returns before it
reaches the UI.

Until `VITE_LEGACY_BRIDGE_URL` is set, importing those three formats fails with a clear
message and their legacy export button stays disabled. JSON export is always available, so
no work is lost.

**This converter is not implemented in this repository yet.** It needs a Windows/.NET
toolchain that is not present in the current environment.

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

`npm run build` and `npm test` pass (71 unit tests, including an AES round trip against the
real `khangpq3Summer2026.fg` file and an MD5 differential check across block boundaries).

The four panels were also driven in a real headless Chrome against the dev server, for 76
browser checks covering import, the password gate, mark validation and reversion, paste
import, merging classes, adding and clearing, building a defense sheet from a thesis comment
plus criteria, defense scale limits and totals, the read-only supervisor comment, JSON round
trips, the converter-unavailable state, and mobile layout at 390 px.

Not yet verified: reopening an exported `.cmt`, `.tef` or `.master` in the original FuGrade
application, because the converter does not exist yet.
