# Repository Guidelines

## Project Structure & Module Organization
This repo is a deployment workspace with two primary submodules:
- `Web-Defect-Detection-System/`: FastAPI backend plus Qt WASM UI assets.
- `Figmaaidefectdetectionsystem/`: Vite + React frontend.

Operational scripts and docs live in `work/ops/` (Linux deployment) and `work/` (notes), while certificates are under `certs/`.

## Build, Test, and Development Commands
Backend (Windows dev example, from `Web-Defect-Detection-System/README.md`):
```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app/server/main.py --config configs/server.json --reload --host 0.0.0.0 --port 8120
```

Frontend:
```bash
cd Figmaaidefectdetectionsystem
npm i
npm run dev
```

Docker (backend):
```bash
cd Web-Defect-Detection-System
docker build -t defect-api .
docker compose up -d --build
```

Ops scripts:
- Linux: `work/ops/deploy_all.sh` (or step scripts in `work/ops/steps/`).
- Windows remote: `work\ops\bootstrap_and_deploy_remote.bat`.

## Coding Style & Naming Conventions
- Python uses 4-space indentation and `snake_case` modules/functions.
- React/TypeScript uses 2-space indentation, `PascalCase` components, and `camelCase` hooks/utilities.
- Prefer existing file patterns; avoid introducing new tooling unless needed.

## Testing Guidelines
There is no dedicated test runner configured. For quick manual checks:
- Start the API and run `python demo/server_demo/api_smoke.py` in `Web-Defect-Detection-System/`.
- Verify UI behavior via `npm run dev` and browser checks.

## Commit & Pull Request Guidelines
Recent commits use short, plain summaries (e.g., `更新脚本4`). Keep messages concise and scoped.
For PRs:
- Describe purpose, key files touched, and how to verify.
- Include screenshots for UI changes.
- Call out config changes (e.g., `configs/server.json`, nginx, or `work/ops` scripts).

## Security & Configuration Tips
- Treat `SSH.pem`, `certs/`, and `work/ops/git_token` as sensitive.
- Do not commit environment-specific secrets; use local overrides where possible.

## Skills
These skills are discovered at startup from multiple local sources. Each entry includes a name, description, and file path so you can open the source for full instructions.
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: C:/Users/Administrator/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: C:/Users/Administrator/.codex/skills/.system/skill-installer/SKILL.md)
- Discovery: Available skills are listed in project docs and may also appear in a runtime "## Skills" section (name + description + file path). These are the sources of truth; skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  3) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  4) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Description as trigger: The YAML `description` in `SKILL.md` is the primary trigger signal; rely on it to decide applicability. If unsure, ask a brief clarification before proceeding.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deeply nested references; prefer one-hop files explicitly linked from `SKILL.md`.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
