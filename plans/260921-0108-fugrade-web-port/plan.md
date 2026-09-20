---
title: "Port FuGrade WinForms to Web"
description: "Migration of the legacy FuGrade grading tool from C# WinForms to a modern web architecture."
status: pending
priority: P1
effort: 80h
branch: main
tags: [migration, .net-to-web, grading-system]
created: 2026-09-21
---

## 1. Outcome
Port the legacy `FuGrade` WinForms application to a web-based system. The goal is to maintain the core functionality of student grading, component management, and secure file-based data storage while moving to a browser-accessible interface.

### Acceptance Criteria
- [ ] **Core Grading Flow**: Ability to load, edit, and save grading sheets (compatible with `.fg` files).
- [ ] **Data Compatibility**: Support for existing AES-encrypted JSON and Binary-serialized data from the legacy app.
- [ ] **Feature Parity**: 
    - Component-based grading (Add/Remove/Clear components).
    - Student management (Add/Search students).
    - Thesis comment and defense grading modules.
    - Excel-like grid for mark entry.
- [ ] **Security**: Implementation of MD5 password verification and AES encryption for exported files.
- [ ] **Tech Stack**: A concrete, minimal web stack suitable for the environment (recommendation provided in phases).

## 2. Constraints & Non-Goals
- **Constraints**: 
    - No fake data; must handle real legacy `.fg` files.
    - Must handle the `FuGradeLib` dependency (will require analyzing the DLL or replicating its logic).
- **Non-Goals**:
    - Implementing a full multi-tenant cloud backend (start with a local-first or single-teacher focus to match the original tool's nature).
    - Redesigning the grading logic; keep it identical to the WinForms version.

## 3. Technical Analysis (Legacy Scout)
- **Data Format**: 
    - Primary: AES-encrypted JSON (Key: `l10ca968o8e4133tyne2ea2315g19377`).
    - Legacy: `BinaryFormatter` (needs careful handling due to security risks in modern .NET).
- **Key Models**:
    - `TeacherGrade`: Root object containing `SubjectClassGrades`.
    - `SubjectClassGrade`: Contains `Students` and `Components`.
    - `Student`: Contains `Roll`, `Name`, `Comment`, and a list of `GradeComponent`.
    - `DefenseGrading`: Separate module for defense marks and `ThesisComment`.
- **Core Logic**: 
    - AES encryption/decryption for file persistence.
    - MD5 hashing for password protection.
    - Excel Interop for some import/export (needs web alternative like SheetJS).

## 4. Proposed Architecture

### Recommended Stack
- **Frontend**: React + TypeScript + Tailwind CSS + TanStack Table (for the complex grading grid).
- **Backend**: ASP.NET Core Web API (to maintain C# logic for AES/MD5 and easy porting of models).
- **Storage**: Client-side file uploads/downloads (matching the "file-based" nature of the original app) OR SQLite if a database is desired. *Recommendation: Stick to file-based JSON for MVP to ensure 100% compatibility with `.fg` files.*

### Data Flow
`User` $\leftrightarrow$ `React Frontend` $\leftrightarrow$ `ASP.NET Core API` $\leftrightarrow$ `AES/JSON Logic` $\leftrightarrow$ `.fg File`

## 5. Implementation Phases

### Phase 1: Foundation & Data Layer (20h)
- [ ] Define TypeScript interfaces matching legacy C# models.
- [ ] Implement AES encryption/decryption in .NET API (port `AesOperation.cs`).
- [ ] Implement MD5 verification (port `Helper.cs`).
- [ ] Create API endpoints for:
    - `POST /api/files/decrypt`: Upload `.fg` $\rightarrow$ Return JSON.
    - `POST /api/files/encrypt`: Upload JSON $\rightarrow$ Return `.fg` file.
- [ ] **Verification**: Unit tests verifying that a legacy `.fg` file can be decrypted and parsed into the new model.

### Phase 2: Core Grading Grid (30h)
- [ ] Implement the main grading dashboard (React).
- [ ] Build the "Excel-like" grid using TanStack Table.
- [ ] Implement "Component" toggles (Show/Hide columns).
- [ ] Implement student search and "Add Student" functionality.
- [ ] Integration: Connect frontend grid to the decrypt/encrypt API.
- [ ] **Verification**: End-to-end test: Load file $\rightarrow$ Edit mark $\rightarrow$ Save $\rightarrow$ Verify file is valid in legacy app.

### Phase 3: Thesis & Defense Modules (20h)
- [ ] Port `FrmThesisComment` logic to a web form.
- [ ] Port `FrmDefenseGrading` logic.
- [ ] Implement the `ThesisStudent` and `DefenseGrading` data flows.
- [ ] **Verification**: Ensure thesis comments are saved and loaded correctly.

### Phase 4: Import/Export & Polish (10h)
- [ ] Replace `Microsoft.Office.Interop.Excel` with a web-compatible library (e.g., `ClosedXML` on backend or `xlsx` on frontend).
- [ ] Implement "Import Marks" and "Import Comments" features.
- [ ] Final UI polish and responsive adjustments.
- [ ] **Verification**: Full regression test against all legacy features.

## 6. Risk & Mitigation
| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `FuGradeLib.dll` missing source | High | High | Reverse engineer DLL or identify its purpose. If it contains critical math, it must be replicated. |
| BinaryFormatter compatibility | Medium | Medium | Prioritize JSON path. For binary files, create a one-time migration tool to convert them to JSON. |
| Grid Performance | Low | Medium | Use virtualization (TanStack Virtual) if student lists exceed 500+ entries. |

## 7. Rollback Plan
Since this is a port to a new repo:
- Each phase is additive. 
- Revert by discarding the current branch.
- Data integrity is maintained because we use the same AES keys and JSON structures as the legacy app.

## 8. Success Criteria
- A user can upload a `.fg` file produced by the WinForms app, edit marks in the browser, and save it back as a `.fg` file that the WinForms app can still open.
- All core grading features (Components, Students, Thesis Comments) are functional.
