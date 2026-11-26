# Fullstack Frontend

仓库地址：https://github.com/Heiqiaoba/fullstack-frontend

独立前端项目：Vite 5 + React 18 + TypeScript + Tailwind 3 + Ant Design 5 + TanStack Query 5 + React Router 7 + Better Auth。

前后端契约类型内嵌在 `src/api/contract.ts`（从原 monorepo 的 shared 包复制而来），项目不依赖任何 workspace 包，可单独 clone 使用。

## 快速开始

```bash
cp .env.example .env
pnpm install
pnpm dev          # http://localhost:5173
```

开发时 Vite 会把 `/api` 代理到 `http://localhost:3000`（见 `vite.config.ts`），需同时启动后端。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` / `pnpm format` | 代码检查 / 格式化 |
| `pnpm test` | 运行测试 |
| `pnpm api:generate` | 根据 `openapi.json` 重新生成 `src/api/generated.d.ts` |

## 与后端同步契约

后端 schema 变更后，从后端项目导出 `openapi.json` 覆盖本项目的同名文件，再执行 `pnpm api:generate`。
领域类型/Zod schema 定义在 `src/api/contract.ts`，如需与后端对齐，手动同步该文件的改动。

## Docker

构建上下文为本目录：

```bash
docker build -t my-frontend .
```

`nginx.conf` 将 `/api` 反代到 `server:3000`（docker compose 服务名）。
