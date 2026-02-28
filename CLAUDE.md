# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a steel defect detection management system with a **monorepo structure** containing two main submodules:

- **`Web-Defect-Detection-System/`** - FastAPI backend + Qt WASM UI assets for defect detection workflows
- **`Figmaaidefectdetectionsystem/`** - Vite + React frontend for visualization and management

## Repository Structure

```
SteelDefectDetectionManage/
├── Web-Defect-Detection-System/    # Backend submodule (FastAPI + Qt WASM)
│   ├── app/
│   │   ├── server/                 # FastAPI application
│   │   │   ├── api/                # API route handlers
│   │   │   ├── services/           # Business logic (defect, image, steel services)
│   │   │   ├── config/             # Configuration management
│   │   │   ├── db/                 # Database models
│   │   │   └── main.py             # Application entry point
│   │   └── ui/DefectWebUi/         # Qt/QML client with WASM build output
│   ├── configs/                    # JSON configs (use server.sample.json as template)
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Container build
│   └── docker-compose.yml
├── Figmaaidefectdetectionsystem/   # Frontend submodule (Vite + React)
│   ├── src/
│   │   ├── api/                    # API client wrappers (client.ts, admin.ts)
│   │   ├── components/             # React components (defect visualization, charts)
│   │   ├── pages/                  # Page-level components (Dashboard, CacheDebug, etc.)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── utils/                  # Utility functions
│   │   └── App.tsx                 # React entry point
│   ├── package.json
│   └── vite.config.ts              # Vite config with proxy to backend
├── work/ops/                       # Deployment & ops scripts for Ubuntu Server 24.04
│   ├── deploy_all.sh               # Full deployment orchestrator
│   ├── steps/                      # Individual deployment steps
│   └── maintenance/                # Status, logs, restart scripts
├── certs/                          # SSL certificates (NOT in VCS)
└── plugins/                        # Platform-specific tools
```

## Development Commands

### Backend (Windows Development)

```powershell
cd Web-Defect-Detection-System
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app/server/main.py --config configs/server.json --reload --host 0.0.0.0 --port 8120
```

### Frontend (Vite + React)

```bash
cd Figmaaidefectdetectionsystem
npm install
npm run dev       # Starts on port 3000
npm run build     # Production build to build/
```

### Docker Deployment

```bash
cd Web-Defect-Detection-System
docker build -t defect-api .
docker compose up -d --build
```

### Linux Production Deployment

```bash
# Full deployment (Ubuntu Server 24.04)
chmod +x work/ops/*.sh work/ops/steps/*.sh
bash work/ops/deploy_all.sh

# Maintenance
pm2 list
pm2 logs defect-api
pm2 logs defect-ui
pm2 restart defect-api
pm2 restart defect-ui
```

## Architecture Notes

### Backend Architecture

- **FastAPI** application with **SQLAlchemy** ORM for database access
- **MSSQL/MySQL** database support via `pymssql`/`pymysql`
- **Casbin** for RBAC (role-based access control)
- **Config Center**: External configuration service at `DEFECT_CONFIG_CENTER_URL` (default `http://127.0.0.1:8119`)
- **Image Services**: Handles large steel plate images with tile caching and prefetching
- **API Routes**: Organized under `app/server/api/` (defects.py, images.py, steels.py, admin.py, cache.py, etc.)
- **Services Layer**: Business logic in `app/server/services/` (image_service.py, defect_service.py, steel_service.py)

### Frontend Architecture

- **Vite** + **React** with TypeScript
- **UI Library**: Radix UI primitives + custom components
- **Styling**: TailwindCSS v4
- **State Management**: React Context (ThemeContext, etc.)
- **API Client**: Centralized in `src/api/client.ts` with typed wrappers
- **Routing**: React Router DOM
- **Proxy Configuration**: Vite dev server proxies `/api` and `/config` to backend (localhost:80)

### Key Configuration

- Backend config loaded from `configs/server.json` via `SERVER_CONFIG_PATH` env var
- Frontend proxies API requests to backend (see `vite.config.ts`)
- SSL certs located at `certs/bkvision.online/` for production
- Default ports: Frontend 3000, Backend 8120/8130

## Code Conventions

- **Python**: 4-space indentation, `snake_case` for modules/functions/variables, type hints preferred
- **TypeScript/React**: 2-space indentation, `PascalCase` components, `camelCase` hooks/utilities
- **API Path Parameters**: Use `snake_case` (e.g., `seq_no`, `steel_id`)
- **Environment Variables**: Use `UPPER_SNAKE_CASE` (e.g., `SERVER_CONFIG_PATH`, `DEFECT_SSL_CERT`)
- **Logging**: Use Python `logging` module, not `print`
- **Components**: Organize by domain (defect, plate, image, cache, admin, etc.)

## Submodule Management

After cloning, initialize submodules:
```bash
git submodule update --init --recursive
```

## Git Proxy (for China)

If using Clash proxy:
```bash
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy https://127.0.0.1:7890
```

## Security Considerations

- Sensitive files NOT in VCS: `SSH.pem`, `certs/`, `work/ops/git_token`, `configs/server.json`
- Use `configs/server.sample.json` as template for configuration
- Image roots (`top_root`, `bottom_root`) should point to network shares with read-only permissions
- Enable TLS for production via `DEFECT_SSL_CERT`/`DEFECT_SSL_KEY` environment variables
