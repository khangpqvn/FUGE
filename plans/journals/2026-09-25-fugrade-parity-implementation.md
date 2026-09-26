---
title: FuGrade parity implementation
date: 2026-09-25
summary: "Added summary aggregation, XLSX export, dirty-state protection, password helper, bridge skeleton; npm tests/build pass, .NET bridge remains environment-blocked."
---

# FuGrade parity implementation

## What happened
Implemented the first full-parity slice in the React/Vite app: FinalGrade aggregation with legacy rounding, batch summary workflow, XLSX Summary/Graded statistics export, summary UI, dirty-state browser protection, bridge request timeout, password compatibility helper, and a separate allowlisted .NET Framework bridge skeleton.

## Decision
Keep BinaryFormatter outside the browser and reference the original legacy assemblies from a loopback-only bridge. Preserve canonical JSON and `.fg` browser compatibility.

## Verification
`npm test` passed with 77 tests. `npm run build` passed with a Vite chunk-size warning. `git diff --check` passed. The environment has no `dotnet`, `msbuild`, or `xbuild`, so bridge compilation, real BinaryFormatter conversion, and original FuGrade round-trips remain unverified.

## Next steps
Review and harden bridge compilation/runtime behavior on a Windows .NET Framework build agent. Complete password-set UI, full dirty-state propagation, batch folder semantics, and original binary compatibility tests.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
