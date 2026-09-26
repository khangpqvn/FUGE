# FuGrade legacy bridge

This is a separate Windows process for `.cmt`, `.tef`, and `.master` BinaryFormatter compatibility. The browser must never deserialize these streams.

## Security boundary

- Binds only to `127.0.0.1:5099`.
- Accepts bytes and canonical JSON only; it never accepts client filesystem paths or type names.
- Uses a fixed route-to-root mapping and a serialization binder allowlist.
- Rejects bodies and responses over 8 MB.
- Returns generic errors and must run as a low-privilege local process.
- Keep the original `FuGrade.exe`, `FuGradeLib.dll`, and Newtonsoft.Json assembly identities available at the relative paths in the project file.

## Build limitation

The current development environment does not have `dotnet`, `msbuild`, or `xbuild`, so this project cannot be built or round-trip tested here. Build and test it on a Windows machine with .NET Framework 4.8-compatible MSBuild and the original legacy assemblies before enabling `VITE_LEGACY_BRIDGE_URL` in production.
