# 黑巧巴笔记（HeiQiaoBa-personal-site）

仓库：https://github.com/Heiqiaoba/HeiQiaoBa-personal-site

由 [`create-project.sh`](../create-project.sh) 从全栈模板生成的项目骨架，现已实现博客核心功能。
**公开注册已关闭**，仅作者账号可进入后台发布笔记。

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

## 功能

- **前台**：首页（数字花园风格，中英双语）、笔记列表/详情（Markdown）、项目/关于占位页
- **后台**：`/admin` 笔记管理（新建/编辑/删除/发布状态），Markdown 正文 + 标签
- **权限**：公开注册关闭；作者账号由 `pnpm create-admin` 创建，后端 `requireAdmin` 是唯一安全边界

## 作者账号

首次部署需创建管理员账号（公开注册已关闭）：

```bash
cd backend
pnpm create-admin <email> <name> <password>   # 密码至少 8 位
```

创建后把输出的 `ADMIN_USER_ID` 配到 `.env` 的 `ADMIN_USER_IDS`（双保险）。
当前本地开发账号：`admin@example.com` / `Admin@123456`（**登录后请尽快改密码**）。

## 脚手架保留的能力

认证（Better Auth）、受保护路由、统一错误处理、请求追踪 ID、限流、
Drizzle 迁移、埋点、Vitest、Biome、Dockerfile、i18n（zh/en）。

新增业务时：后端在 `backend/src/db/schema.ts` 加表并 `pnpm db:generate`；
前后端共用的类型放在各自的 `contract.ts`（两边各一份，需同步）。
功能规划见 [`docs/roadmap.md`](docs/roadmap.md)。
