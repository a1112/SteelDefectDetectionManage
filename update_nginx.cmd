@echo off
set "SCRIPT_DIR=%~dp0"
python "%SCRIPT_DIR%work\ops\nginx\apply_net_table_nginx.py" --nginx-bin "%SCRIPT_DIR%plugins\platforms\windows\nginx\nginx.exe" --apply
