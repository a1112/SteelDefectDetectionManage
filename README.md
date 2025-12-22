使用clash 代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy https://127.0.0.1:7890
项目克隆： 
git clone --recurse-submodules https://github.com/a1112/SteelDefectDetectionManage
补拉子模块:
git submodule update --init --recursive