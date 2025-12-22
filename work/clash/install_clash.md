Clash 安装与运行（含脚本与手动方式）

一、直接运行（已上传并解压后如何用）
1) 赋予执行权限并放到 PATH
```bash
chmod +x /path/to/clash
mv /path/to/clash /usr/local/bin/clash
```

2) 使用配置文件启动
```bash
clash -f /path/to/your/config.yaml -d /var/lib/clash
```

二、自动化脚本（推荐）
Windows 一键上传并安装（本地执行 `install_clash.bat`）：
- 会上传 `clash-linux-amd64-latest.gz`、`1755607623989.yml` 和 `install_clash.sh` 到服务器 `/tmp`
- 然后 SSH 执行 `/tmp/install_clash.sh`

Linux/macOS 手动执行（已上传文件时）：
```bash
sudo sh /tmp/install_clash.sh
```

脚本行为（install_clash.sh）：
- 解压 `clash-linux-amd64-latest.gz` 到 `/usr/local/bin/clash`
- 复制配置到 `/etc/clash/config.yaml`
- 创建工作目录 `/var/lib/clash`
- 写入 systemd 服务并启动

三、systemd 服务说明
服务文件位置：`/etc/systemd/system/clash.service`
```ini
[Unit]
Description=Clash Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/lib/clash
ExecStart=/usr/local/bin/clash -f /etc/clash/config.yaml -d /var/lib/clash
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

常用命令：
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now clash.service
systemctl status clash.service
```

四、切换策略组节点（API + jq）
安装 jq：
```bash
sudo apt install -y jq
```

查看当前策略组：
```bash
curl --request GET --url http://127.0.0.1:9091/proxies
```

只查看策略组当前节点（示例：策略组名包含 emoji/中文）：
```bash
curl --request GET --url http://127.0.0.1:9091/proxies | jq '.proxies."🚀 节点选择".now'
```

切换节点（注意 URL 需要对策略组名做编码）：
```bash
curl --request PUT --url "http://127.0.0.1:9091/proxies/%F0%9F%9A%80%20%E8%8A%82%E7%82%B9%E9%80%89%E6%8B%A9" \
  --header "Content-Type: text/plain" \
  --data "{\"name\": \"<替换为你想要选择的节点名>\"}"
```

再次确认：
```bash
curl --request GET --url http://127.0.0.1:9091/proxies | jq '.proxies."🚀 节点选择".now'
```
