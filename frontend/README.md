# Fullstack Frontend（黑巧巴笔记）

本项目前端：Vite 5 + React 18 + TypeScript + Tailwind 3 + Ant Design 5 + ByteMD + TanStack Query。
仓库：https://github.com/Heiqiaoba/HeiQiaoBa-personal-site （`frontend/` 目录）

## 快速开始

```bash
cp .env.example .env
pnpm install
pnpm dev              # http://localhost:5174
```

开发时 Vite 代理：`/api` 和 `/uploads` → `http://localhost:3100`（见 `vite.config.ts`），需同时启动后端。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | 类型检查 / 检查 / 格式化 |
| `pnpm test` | 运行测试 |
| `pnpm api:generate` | 根据 `openapi.json` 重新生成 `src/api/generated.d.ts` |

## 功能

- 前台：首页/文章卡片、详情（TOC/代码复制/阅读进度/上下篇）、深浅主题、中英双语
- 写作台 `/write`：概览、文章管理、草稿箱、ByteMD 编辑器（图片上传）
- 契约类型在 `src/api/contract.ts`，与后端各持一份，改契约需两端同步

## 生产部署

`Dockerfile` + `nginx.conf`：Nginx 托管静态资源，`/api` 与 `/uploads` 均反代到后端容器。
