# 运维脚本

本目录包含 Ubuntu Server 24.04 的部署与运维脚本。

默认路径（如需可用环境变量覆盖）：
- PROJECT_ROOT=/opt/project
- REPO_ROOT=$PROJECT_ROOT/SteelDefectDetectionManage
- WEB_DIR=$REPO_ROOT/Web-Defect-Detection-System
- UI_DIR=$REPO_ROOT/Figmaaidefectdetectionsystem
- CERT_DIR=$REPO_ROOT/certs/bkvision.online
- DOMAIN=www.bkvision.online

快速部署：
```bash
chmod +x work/ops/*.sh work/ops/steps/*.sh
bash work/ops/deploy_all.sh
```

Windows 远程克隆（0 -> 1）：
```bat
call work\ops\bootstrap_repo.bat
```

Windows 远程部署：
```bat
call work\ops\deploy_all_remote.bat
```

Windows 远程克隆+部署：
```bat
call work\ops\bootstrap_and_deploy_remote.bat
```

分步骤脚本：
- work/ops/steps/00_bootstrap_repo.sh
- work/ops/steps/01_check_env.sh
- work/ops/steps/02_setup_backend.sh
- work/ops/steps/03_setup_frontend.sh
- work/ops/steps/04_pm2_start.sh
- work/ops/steps/05_nginx_setup.sh
- work/ops/steps/06_pm2_startup.sh

日常维护：
- work/ops/maintenance/01_status.sh
- work/ops/maintenance/02_logs.sh
- work/ops/maintenance/03_restart.sh

常用指令：
- pm2 list
- pm2 logs defect-api
- pm2 logs defect-ui
- pm2 restart defect-api
- pm2 restart defect-ui
- sudo nginx -t
- sudo systemctl reload nginx

端口映射：
- 80 -> 3000（前端）
- 443 -> 3000（前端，SSL）
- 8120 -> 8120（后端，HTTP）
- 8130 -> 8130（后端，HTTP）
- 8220 -> 8120（后端，SSL）
- 8230 -> 8130（后端，SSL）

说明：
- 后端使用 run_debug_server_dev.py（8120/8130）。
- Nginx 负责 SSL 终止并转发到前后端。
- 前端代理规则在 Figmaaidefectdetectionsystem/vite.config.ts。
