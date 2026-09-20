# FUGE Grade Desk

Web port of the legacy FuGrade WinForms grading tool.

## Current scope

The first web slice provides a working browser grading desk:

- Opens AES-encrypted JSON `.fg` grading files created by FuGrade.
- Checks the legacy file password hash before showing the sheet.
- Switches between subject/class groups or merges all classes.
- Searches students, edits comments, and edits marks.
- Validates entered marks from 0 through 10.
- Downloads the edited data back as a legacy-compatible encrypted `.fg` file.

Legacy `.cmt`, `.tef`, and `.master` files are not deserialized in the browser. They use the unsafe, platform-specific `BinaryFormatter` format and require an isolated migration utility before they can be supported safely.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

Open the local URL printed by Vite. The landing screen accepts a real `.fg` file. The repository does not include a fabricated grading file; the demo model is used only for the compatibility label and empty-state UI.

## Compatibility notes

The legacy `.fg` format is Base64 text containing AES-CBC encrypted JSON. The bridge uses the legacy zero IV and key-compatible implementation and preserves the legacy field names (`Version`, `Semester`, `Login`, `Password`, `SubjectClassGrades`, etc.) during import/export.

The old application also supports `BinaryFormatter` files. This web app intentionally rejects those formats until a separate allowlisted converter is available. Original files should be kept as backups before migration.

## Remaining port work

- Isolated migration for `.cmt`, `.tef`, and `.master`.
- Thesis comment workflow.
- Defense evaluation grid and final summary export.
- Criteria management and mark/comment paste import.
- Backend persistence and multi-user access, if required.
