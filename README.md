# 黑巧笔记（HeiQiaoBa-personal-site）

仓库：https://github.com/Heiqiaoba/HeiQiaoBa-personal-site

由 [`create-project.sh`](../create-project.sh) 从全栈模板生成的项目骨架。
**演示业务代码（Todo / 用户列表 / 管理端）已在生成时移除**，只保留工程能力与认证骨架。

## 目录

- `frontend/` — React 18 + Vite 5 + TypeScript + Ant Design 5 + TanStack Query
- `backend/` — Node 22 + Fastify 5 + Drizzle ORM + PostgreSQL 16 + Better Auth

## 端口

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:5174 |
| 后端 | http://localhost:3100 |
| API 文档 | http://localhost:3100/docs |
| PostgreSQL | localhost:5433 |

## 首次启动

```bash
# 后端依赖 + 数据库 + 迁移
cd backend
pnpm install
docker compose up -d postgres
pnpm db:generate      # 骨架已清空旧迁移，首次必须重新生成
pnpm db:migrate
pnpm dev

# 前端（另开终端）
cd ../frontend
pnpm install
cp .env.example .env  # 已生成，可按需修改
pnpm dev
```

## 脚手架保留的能力

认证（Better Auth）、受保护路由、统一错误处理、请求追踪 ID、限流、
Drizzle 迁移、埋点、Vitest、Biome、Dockerfile。

新增业务时：后端在 `backend/src/db/schema.ts` 加表并 `pnpm db:generate`；
前后端共用的类型放在各自的 `contract.ts`（两边各一份，需同步）。
