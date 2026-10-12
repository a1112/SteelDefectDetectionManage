# Version management: SteelDefectDetectionManage

## Current authorities

Versions belong to the release units below. Equal numbers do not imply a shared release. Adoption preserves every existing version value; this document does not announce a release.

- `frontend`: `0.1.0` from `Figmaaidefectdetectionsystem/package.json` (explicit opt-in edits).
- `backend-api`: `0.2.1` from `Web-Defect-Detection-System/configs/version.json` (explicit opt-in edits).
  Existing backend release marker0.2.1 remains separate from frontend and packaging0.1.0.
- `android-tauri`: `0.1.0` from `Build/Android/TauriBuild/package.json` (explicit opt-in edits).
  Independent platform packaging manifest; no cross-platform lockstep is inferred.
  Verified mirrors: `Build/Android/TauriBuild/package-lock.json`, `Build/Android/TauriBuild/package-lock.json`, `Build/Android/TauriBuild/src-tauri/Cargo.toml`, `Build/Android/TauriBuild/src-tauri/tauri.conf.json`, `Build/Android/TauriBuild/src-tauri/Cargo.lock`.
- `windows-tauri`: `0.1.0` from `Build/Windows/TauriBuild/package.json` (explicit opt-in edits).
  Independent platform packaging manifest; no cross-platform lockstep is inferred.
  Verified mirrors: `Build/Windows/TauriBuild/src-tauri/Cargo.toml`, `Build/Windows/TauriBuild/src-tauri/tauri.conf.json`, `Build/Windows/TauriBuild/src-tauri/Cargo.lock`.
- `macos-tauri`: `0.1.0` from `Build/macOS/TauriBuild/package.json` (explicit opt-in edits).
  Independent platform packaging manifest; no cross-platform lockstep is inferred.
  Verified mirrors: `Build/macOS/TauriBuild/src-tauri/Cargo.toml`, `Build/macOS/TauriBuild/src-tauri/tauri.conf.json`, `Build/macOS/TauriBuild/src-tauri/Cargo.lock`.
- `windows-electron`: `0.1.0` from `Build/Windows/ElectronBuild/package.json` (explicit opt-in edits).
- `macos-electron`: `0.1.0` from `Build/macOS/ElectronBuild/package.json` (explicit opt-in edits).

## Safe local commands

Python 3.11 or newer is required. Both tools use only the standard library. They do not import the application, access devices or networks, install dependencies, run npm lifecycle hooks, build packages, commit, tag, publish, upload, or deploy.

```sh
python scripts/version_manager.py show
python scripts/version_manager.py check
python scripts/check_version_sources.py check
python -m unittest discover -s tests -p test_version_manager.py -v
python -m unittest discover -s tests -p test_version_sources.py -v
```

A bump or set previews the exact edits by default. Choose one unit explicitly; inspect the diff before opting in:

```sh
python scripts/version_manager.py bump patch --unit frontend
python scripts/version_manager.py bump patch --unit frontend --expect 0.1.0 --apply
python scripts/version_manager.py check
python scripts/check_version_sources.py check
git diff --check
git diff
```

The `0.1.0` value is an adoption-time example; replace it with the current value shown by `show`. A stale expectation is refused. `set` also previews by default and requires `--expect` with `--apply`. Review compatibility before selecting major/minor/prerelease changes. Use each ecosystem's existing build/test flow after an edit. Only explicitly listed local package lock entries are edited; registry dependencies are never version sources.

## Native and unversioned boundaries

The read-only native checker uses static parsing for CMake, setuptools INI, Python tuple-derived versions, C++ constants, and Windows resources. It never runs setup.py or evaluates arbitrary Python. For these sources, make a reviewed ecosystem-specific edit to the canonical field and its listed mirrors, then run both checks and the native build/package tests. Qt/QML import versions, database migrations, SDK/dependency versions, vendor trees, binaries, backups and Gitlinks are excluded.

- `deployment-workspace`: Root package.json is an unversioned task runner. Qt/WASM project and deployed nginx/vendor assets keep their own provenance; deployment scripts are not run by version tooling.
  Scope: `package.json`, `Web-Defect-Detection-System/app/ui/DefectWebUi`, `plugins`.

## Source revision identity

Use `git rev-parse --verify HEAD` to record an immutable source revision for deployments. For unversioned components and datasets, include that revision with the component path and the reviewed configuration/data provenance. It is not a claim of a numbered product release.

## Release procedure

1. Select the actual release unit and inspect its existing version authority. Use source commit identity for unversioned operational components until an intentional baseline is agreed; do not label mature code 0.1.0 by guesswork.
2. Preview changes, apply only reviewed owned version fields, and run the read-only checks plus the component's normal tests/build. Review lockfile and native mirrors; keep unrelated versions unchanged.
3. Write truthful changes under `Unreleased` in `CHANGELOG.md`. Move entries into a dated release section only when a release actually occurs.
4. Review release artifacts, environment-specific configuration, compatibility, existing signing/SBOM policies and deployment approvals separately. Tags, releases, distribution and deployment are manual decisions outside this tooling.

## Adoption provenance

- Source base: [`5a000b4cffc0cbd55d56395ebdf78f19f98fb813`](https://github.com/a1112/SteelDefectDetectionManage/commit/5a000b4cffc0cbd55d56395ebdf78f19f98fb813) from `main`.
- Observed default head: `5a000b4cffc0cbd55d56395ebdf78f19f98fb813` on `main`. The default branch and prior repair refs are not changed.
- Review branch: `chore/version-management-20261012`.
- Repository tags/releases and the central R-Box-Releases identity map were checked during adoption. No central release was verified as this repository's application history. Existing source versions remain authoritative; absence of a GitHub release does not prove an application has never been delivered.
- Only version metadata, documentation, local tooling/tests and a read-only metadata CI workflow are introduced. Full native/runtime/device builds were not run for this adoption; local version-tool checks are not a product acceptance test.
