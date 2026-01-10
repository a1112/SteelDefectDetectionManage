# GEMINI.md - 项目上下文与指令指南

## 1. 项目概览 (Project Overview)
**项目名称**: 钢材缺陷检测管理系统 (Steel Defect Detection Management System)
**核心功能**: 实时钢材缺陷图像处理、多流水线服务监控、缺陷数据存储与检索、可视化大屏显示。
**核心架构**:
- **后端 (Backend)**: 基于 Python FastAPI 的多实例架构。支持 SQLAlchemy 适配 MySQL/SQLServer/SQLite。核心逻辑位于 `Web-Defect-Detection-System/`。
- **前端 (Frontend)**: 
  - **React 客户端**: 位于 `Figmaaidefectdetectionsystem/`，基于 Vite + TS + TailwindCSS，提供现代化的管理界面。
  - **Qt WASM**: 嵌入式/高性能 Web 客户端支持。
- **桌面端 (Desktop)**: 支持通过 `ElectronBuild` 和 `TauriBuild` 将 Web 应用打包为跨平台桌面程序。
- **运维 (Ops)**: 完善的 Linux (Ubuntu) 和 Windows 部署脚本，使用 PM2 进行进程管理，Nginx 负责反向代理和 SSL。

## 2. 构建与运行 (Building & Running)

### 后端 (Web-Defect-Detection-System)
- **环境准备**: Python 3.10+, 虚拟环境推荐。
- **安装依赖**: `pip install -r requirements.txt`
- **本地启动**: 
  ```powershell
  python server.py --test_data --reload
  ```
  *注：`server.py` 是多线启动器，会自动管理 `8119` (配置中心) 及各条生产线的 API 端口 (8200+)*。

### 前端 (Figmaaidefectdetectionsystem)
- **安装依赖**: `npm install`
- **开发模式**: `npm run dev` (默认端口 5173)
- **生产打包**: `npm run build` (输出至 `build/` 目录)

### 桌面端打包
- **Electron**: `cd ElectronBuild && npm run dist`
- **Tauri**: `cd TauriBuild && build.bat`

### 自动化部署
- **Linux**: `bash work/ops/deploy_all.sh`
- **Windows 远程**: `work\ops\deploy_all_remote.bat`

## 3. 开发规范 (Development Conventions)

### 编码风格 (根据 AGENTS.md)
- **Python**: 4 步缩进，`snake_case` 命名，遵循 FastAPI 异步处理模式。
- **React/TypeScript**: 2 步缩进，组件使用 `PascalCase`，Hook 使用 `camelCase`。
- **组件库**: 优先使用根目录下定义的 Radix UI 组件。

### 目录约定
- `certs/`: 存放 SSL 证书 (bkvision.online)。
- `configs/`: 存放系统配置模板及当前运行配置。
- `work/`: 存放业务逻辑文档、运维脚本及维护记录。
- `TestData/`: 包含用于 DEBUG 模式的模拟数据库和图像。

## 4. 关键文件与路径 (Key Files)
- `Web-Defect-Detection-System/server.py`: 后端多实例启动与监控逻辑。
- `Figmaaidefectdetectionsystem/src/App.tsx`: 前端路由与核心框架。
- `work/ops/README.md`: 详细的运维与端口映射说明。
- `AGENTS.md`: AI 代理的编程准则。

## 5. 常见任务说明 (Common Tasks)
- **添加新流水线**: 修改 `configs/current/map.json` 并重启 `server.py`。
- **更新 Nginx**: 执行 `apply_nginx.ps1` (Windows) 或修改 `work/ops/nginx/` 配置。
- **SSL 配置**: 证书位于 `certs/bkvision.online/`，需确保 Nginx 正确指向这些文件。

---
*此文档由 Gemini 自动生成，用于在 CLI 环境下提供项目上下文。*
