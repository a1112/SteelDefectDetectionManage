# 缺陷视图与相邻瓦片缓存上限

默认基线 `5a000b4cffc0cbd55d56395ebdf78f19f98fb813` 中，`DefectImageView` 的瓦片缓存和 Dashboard 的相邻钢板预取缓存是模块级 Map。每次不同钢板、面或图像字段产生新键后，已完成图片会持续保留。它们经实际 `queueTileImageLoad` 写入，且可从 App → Dashboard → DefectsPage → DefectImageView 的生产路径到达。

两处声明改为项目现有 `getOrCreateLRUCache`，使用独立固定名称和 500 项上限，与 ImagesTab、TraditionalMode 的既有策略一致。LRU 淘汰冷图片时清空其 `src`；访问缓存更新最近使用顺序；返回已淘汰瓦片时按原加载器重新加载。现有 beforeunload 清理机制现在也覆盖这两处已完成图片缓存。请求、预取优先级、队列和绘制逻辑未改动。

## 复现与回归

运行 Node 内置测试，需要可访问的 TypeScript 5.7.3 编译器：

```sh
cd Figmaaidefectdetectionsystem
TYPESCRIPT_PATH=/path/to/typescript/lib/typescript.js node --test --test-concurrency=1 --test-reporter=tap scripts/tile-cache-lifecycle.node.cjs
node --check scripts/tile-cache-lifecycle.node.cjs
```

脚本转译实际两个 TSX 模块，在内存中仅追加私有 cache/loading 绑定的测试导出。UI/API 依赖采用严格允许列表的空替身，不挂载组件、不执行应用初始化；实际 LRU 与瓦片加载器源码在 VM 中执行，使用 fake Image、计时器和 unload 事件目标。图片源为合成字符串，没有实际下载、图像解码或相机输入。

2026-10-19，在生产源码未修改时，16 个用例为 8 通过、8 失败；修复后 16/16 通过。最初一次命令遗漏编译器路径，在测试启动前失败；随后提供既有编译器路径并完成有效基线，原始日志均保留。

| 每处缓存完成 1,000 次合成图片加载后 | 原实现 | 修复后 |
| --- | --- | --- |
| 已缓存图片项 | 1,000 | 500 |
| fake Image 中保留非空 src 的数量 | 1,000 | 500 |

用例还覆盖热项保护、冷项释放、淘汰后重新加载、已完成缓存的 unload 清理、热缓存命中、图片失败后重试、现有 LRU 接口与命名隔离，以及加载器六路并发和队列排空。测试工具会保留 fake Image 引用以供断言，数量不是堆回收或 RAM 测量。

类型检查使用 AST 从实际 TSX 源码提取两处缓存声明，连同真实 LRU、加载器模块，以及加载器缓存接口和绘制 fallback 的 `get` 接口契约，以 TypeScript 5.7.3 strict/noEmit 检查，基线和修复后均通过。实际 TSX 的语法转译和测试脚本语法检查通过。它不是整个前端的完整类型检查；当前项目无 tsconfig 或依赖锁文件，package.json 未配置测试命令，本轮未安装未锁定依赖、运行全前端构建或原生打包。

500 是每处缓存的条目上限，不是字节预算。此次没有验证真实 DOM、GPU、原生拖拽/缩放或整应用 RAM；完整 RAM 配对仍为 0。未连接设备或相机，未启动推理、采集、API、工业服务或部署脚本，也未修改运维、凭据、服务器缓存或在途请求取消逻辑。
