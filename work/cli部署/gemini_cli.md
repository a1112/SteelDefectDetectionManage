npm install -g @google/gemini-cli
npm install -g undici
C:\Users\你的用户名\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js macOS: /opt/homebrew/lib/node_modules/@google/gemini-cli/dist/index.js Linux: /usr/local/lib/node_modules/@google/gemini-cli/dist/index.js

编辑主文件 index.js，在文件开头（所有 import 语句之后）添加以下代码：

import { setGlobalDispatcher, ProxyAgent } from "undici";
const dispatcher = new ProxyAgent({ uri: 'http://127.0.0.1:7890' }); // 修改为您的代理端口
setGlobalDispatcher(dispatcher);