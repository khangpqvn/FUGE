# Implementation Plan: Porting FuGrade to Web Base

## 1. Executive Summary
Port the legacy .NET Framework 3.5 WinForms application `FuGrade` to a modern web-based architecture. The system maintains core grading workflows for general grading, defense grading, criteria management, and thesis comments while ensuring 100% data compatibility with legacy file formats.

## 2. Technical Stack Selection
Based on the requirement for C# logic porting (AES/MD5) and a complex grading grid, the following stack is selected:
- **Backend**: ASP.NET Core 8.0 Minimal API (High performance, easy port of `AesOperation` and `Helper` logic).
- **Frontend**: React 18 + TypeScript + Vite (Type safety for complex grading models).
- **UI Components**: Tailwind CSS + shadcn/ui + TanStack Table (Essential for the Excel-like grading grid with virtualization).
- **Data Format**:
    - **Current/Web**: JSON (Canonical form).
    - **Legacy Compatibility**: AES-CBC (PKCS7) encrypted JSON for `.fg` files.
    - **Legacy Migration**: Isolated .NET Framework 3.5 process/container to convert `BinaryFormatter` files (`.cmt`, `.tef`, `.master`) to JSON, as `BinaryFormatter` is prohibited in new code.

## 3. Data Model & API Design

### 3.1 Core Models (Ported from `FuGradeLib`)
- `TeacherGrade`: Version, Semester, Login, Password, `List<SubjectClassGrade>`.
- `SubjectClassGrade`: Subject, Class, `List<Student>`, `List<string> Components`.
- `Student`: Roll, Name, Comment, `List<GradeComponent>`.
- `GradeComponent`: Component, Grade (nullable float).
- `ThesisComment`: Metadata, Texts, `List<ThesisStudent> Conclusion`.
- `DefenseGrading`: Metadata, `List<DefenseStudentGrade> GradeStudents`.

### 3.2 API Endpoints
- **Legacy Bridge**:
    - `POST /api/legacy/fg/import`: Upload `.fg` $\rightarrow$ Decrypt $\rightarrow$ Return JSON Draft.
    - `POST /api/legacy/fg/export`: JSON $\rightarrow$ Encrypt $\rightarrow$ Download `.fg`.
    - `POST /api/legacy/binary/migrate`: Upload `.cmt/.tef/.master` $\rightarrow$ Isolated Conversion $\rightarrow$ JSON.
- **Grading Logic**:
    - `GET/PUT /api/sheets/{id}/students`: Manage students in a specific class.
    - `PATCH /api/sheets/{id}/marks`: Bulk update marks for components.
    - `POST /api/sheets/{id}/import-marks`: Import from external source.
- **Defense & Criteria**:
    - `GET/PUT /api/criteria`: CRUD for grading criteria by subject.
    - `POST /api/defense/evaluate`: Process defense marks against criteria.

## 4. Implementation Slices (Deliverables)

### Slice 1: Compatibility Layer & Foundation (P0)
- [ ] Port `AesOperation.cs` and `Helper.cs` to ASP.NET Core.
- [ ] Implement `.fg` $\leftrightarrow$ JSON bidirectional conversion.
- [ ] Create the "Binary Migration" bridge for `BinaryFormatter` files.
- [ ] Define TypeScript interfaces for all legacy models.

### Slice 2: Core Grading Dashboard (P0)
- [ ] Implement the main grading grid using TanStack Table (support for frozen columns, virtualization).
- [ ] Feature: Load `.fg` file $\rightarrow$ Password Gate $\rightarrow$ Subject/Class Selector.
- [ ] Feature: Component visibility toggles and "Merge Classes" view.
- [ ] Feature: Mark entry (0-10 range validation) and Student Search/Add.

### Slice 3: Thesis Comments & Defense Workflow (P1)
- [ ] Port `FrmThesisComment` flow: Form validation (VN/EN/Title/etc.) and Conclusion matrix.
- [ ] Port `FrmDefenseGrading` flow: Load group $\rightarrow$ Criteria matching $\rightarrow$ Per-student mark entry.
- [ ] Integration: Thesis comments triggerable from main grid for groups $\le 6$.

### Slice 4: Criteria Admin & Data Hardening (P2)
- [ ] Port `FrmCreateFinalCPGradingItems`: Subject-based criteria management with scale validation.
- [ ] Implement "Import Marks/Comments" via CSV/Excel (SheetJS).
- [ ] Security hardening: Path traversal protection, size limits on uploads, session timeout.

## 5. Security & Legacy Treatment
- **Encryption**: Use the legacy hard-coded key `l10ca968o8e4133tyne2ea2315g19377` and zero-IV for `.fg` compatibility.
- **BinaryFormatter**: Strictly banned in the main web app. A separate, restricted "Migration Tool" (running in a sandbox) will be used for one-time conversion of legacy binary files.
- **Passwords**: MD5 lowercase hex strings as per `Helper.GetMd5Hash`.

## 6. Testing & Quality Assurance
- **Crypto Golden Vectors**: Compare output of new `AesOperation` vs legacy WinForms outputs.
- **Compatibility Matrix**: Verify that `.fg` files exported from Web can be opened in legacy WinForms.
- **Regression**: Playwright E2E tests for:
    - `.fg` import $\rightarrow$ Edit mark $\rightarrow$ Export $\rightarrow$ Verify.
    - Thesis comment $\rightarrow$ Save $\rightarrow$ Load in Defense module.
    - Criteria change $\rightarrow$ Update Defense grading sheet.

## 7. Risks & Rollback
- **Risk**: `FuGradeLib.dll` might contain undocumented logic. *Mitigation*: Reverse engineer and replicate logic in the new API.
- **Risk**: Browser grid performance with 100+ students/components. *Mitigation*: Use TanStack Virtual.
- **Rollback**: Since the system is a port, the original legacy app remains the source of truth. Users always download a copy of the `.fg` file; no destructive changes to original files.

### Unresolved Questions
1. Are there sample `.fg`, `.cmt`, `.tef` files available for testing?
2. Should the system implement a server-side database (SQL) or remain a "file-in, file-out" tool?
3. Is writing new binary `.cmt/.tef` files required, or is JSON-only sufficient for new data?
