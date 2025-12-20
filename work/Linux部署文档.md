目标系统 ： Ubuntu Server 24.04 LTS 64bit
安装软件：
    git
    python3.10
    nginx
    nodejs
    pm2
    mysql 5.7  (root 密码 nercar)
    gitlab-runner
    redis
    codex
    以及一些配套的软件

部署要求：
    项目目录 opt/project
    git 克隆 Figmaaidefectdetectionsystem  Web-Defect-Detection-System

    Web-Defect-Detection-System：
        安装 requirements.txt 中内容
        PM2 持续运行 run_debug_server_dev.py  内部 端口应该是 8120   8130
    
    Figmaaidefectdetectionsystem：
        使用 npm 安装依赖
        npm dev 运行

nginx配置：
    域名 www.bkvision.online
    ip: 111.230.72.96
    ssl 位置： certs\bkvision.online

端口映射：
    80->3000
    443->3000   ssl
    8120->8120
    8130->8130
    8220->8120  ssl
    8230->8130  ssl

生成统一脚本以及分步骤脚本，常用指令 运维清单

运维脚本位置：
    work/ops/
    统一脚本：work/ops/deploy_all.sh
    分步骤脚本：work/ops/steps/01_check_env.sh ... 06_pm2_startup.sh
    nginx 模板：work/ops/nginx/bkvision.online.conf

常用指令（示例）：
    pm2 list
    pm2 logs defect-api
    pm2 logs defect-ui
    pm2 restart defect-api
    pm2 restart defect-ui
    nginx -t
    systemctl reload nginx
