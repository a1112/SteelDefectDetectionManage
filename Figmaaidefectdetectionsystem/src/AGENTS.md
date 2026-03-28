# AI Agent 开发指南

## ⚠️ 重要：路径映射说明

### Figma Make 环境特殊性

在 Figma Make 环境中工作时，**必须特别注意文件路径映射**：

- **你看到的路径**: `/components/backend/UISettings.tsx`
- **实际项目路径**: `/src/components/backend/UISettings.tsx`
- **Git 提交路径**: `src/components/backend/UISettings.tsx`

### 原因

Figma Make 只暴露了项目的 `/src` 目录给 AI，因此：
- 在 Figma Make 中，你的工作根目录 = 项目的 `/src` 目录
- 使用 Figma Make 的文件工具（read/write/edit）时，路径正常
- 但使用 Git/GitHub 工具时，必须在路径前加上 `src/` 前缀

### 正确的操作流程

#### ✅ 正确示例

```typescript
// 1. 使用 Figma Make 工具时（正常路径）
read({ path: "/components/backend/UISettings.tsx" })
write_tool({ path: "/components/backend/UISettings.tsx", ... })

// 2. 使用 Git 工具时（加 src/ 前缀）
push_files({
  files: [{
    path: "src/components/backend/UISettings.tsx",  // ✅ 正确
    content: "..."
  }]
})

delete_file({
  path: "src/components/backend/UISettings.tsx"  // ✅ 正确
})
```

#### ❌ 错误示例

```typescript
// ❌ 错误：会将文件推送到项目根目录而非 src/ 目录
push_files({
  files: [{
    path: "components/backend/UISettings.tsx",  // ❌ 错误！
    content: "..."
  }]
})
```

### 检查清单

在使用 GitHub 工具之前，请确认：

- [ ] 所有文件路径都以 `src/` 开头
- [ ] 路径结构与 Figma Make 中看到的一致（只是添加了 `src/` 前缀）
- [ ] 检查是否意外创建了根目录文件（如 `components/`、`pages/` 等）

### 目录结构参考

```
项目根目录/
├── src/                          # Figma Make 的根目录（你看到的 /）
│   ├── components/               # 你看到的 /components
│   │   ├── backend/
│   │   ├── layout/
│   │   └── ui/
│   ├── pages/                    # 你看到的 /pages
│   ├── api/                      # 你看到的 /api
│   ├── contexts/                 # 你看到的 /contexts
│   └── App.tsx                   # 你看到的 /App.tsx
├── public/
├── package.json
└── ...
```

---

## 项目约定

### 参考 Guidelines.md

请务必遵循 `/Guidelines.md` 中的所有规范：
- API 调用规范
- 类型定义位置
- 组件结构约定
- 开发/生产模式切换

### Git 提交规范

使用语义化提交信息：
- `feat:` 新功能
- `fix:` 修复 bug
- `chore:` 琐碎任务（如删除无用文件）
- `refactor:` 重构代码
- `docs:` 文档更新
- `style:` 代码格式调整

---

## 常见问题

### Q: 为什么我的文件出现在项目根目录？

**A**: 你在使用 GitHub 工具时忘记添加 `src/` 前缀。请立即删除错误位置的文件，并重新推送到正确路径。

### Q: 如何验证路径是否正确？

**A**: 
1. 在 Figma Make 中看到的路径：`/components/backend/UISettings.tsx`
2. Git 提交时的路径：`src/components/backend/UISettings.tsx`
3. 最终在 GitHub 上的路径：`src/components/backend/UISettings.tsx`

### Q: 如果已经提交到错误位置怎么办？

**A**: 使用 `delete_file` 工具删除错误位置的文件，然后使用 `push_files` 推送到正确位置。

---

## 更新日期

最后更新：2025-12-26

## 相关文档

- [Guidelines.md](./Guidelines.md) - 项目开发指南
- [README.md](./README.md) - 项目说明
