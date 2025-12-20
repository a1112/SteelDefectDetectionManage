# Ops Scripts

This folder contains deployment helpers for Ubuntu Server 24.04.

Default paths (override with env vars if needed):
- PROJECT_ROOT=/opt/project
- REPO_ROOT=$PROJECT_ROOT/SteelDefectDetectionManage
- WEB_DIR=$REPO_ROOT/Web-Defect-Detection-System
- UI_DIR=$REPO_ROOT/Figmaaidefectdetectionsystem
- CERT_DIR=$REPO_ROOT/certs/bkvision.online
- DOMAIN=www.bkvision.online

Quick deploy:
```bash
chmod +x work/ops/*.sh work/ops/steps/*.sh
bash work/ops/deploy_all.sh
```

Step-by-step scripts:
- work/ops/steps/01_check_env.sh
- work/ops/steps/02_setup_backend.sh
- work/ops/steps/03_setup_frontend.sh
- work/ops/steps/04_pm2_start.sh
- work/ops/steps/05_nginx_setup.sh
- work/ops/steps/06_pm2_startup.sh

Common operations:
- pm2 list
- pm2 logs defect-api
- pm2 logs defect-ui
- pm2 restart defect-api
- pm2 restart defect-ui
- sudo nginx -t
- sudo systemctl reload nginx

Ports:
- 80 -> 3000 (frontend)
- 443 -> 3000 (frontend, SSL)
- 8120 -> 8120 (backend, HTTP)
- 8130 -> 8130 (backend, HTTP)
- 8220 -> 8120 (backend, SSL)
- 8230 -> 8130 (backend, SSL)

Notes:
- Backend uses run_debug_server_dev.py (8120/8130).
- Nginx terminates SSL with certs in CERT_DIR and proxies to backend/front.
- Frontend proxy rules live in Figmaaidefectdetectionsystem/vite.config.ts.
