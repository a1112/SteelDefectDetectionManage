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
