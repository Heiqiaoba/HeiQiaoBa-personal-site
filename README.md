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
# 1. 生成环境变量（含强随机 BETTER_AUTH_SECRET）
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. 后端：依赖 + 数据库 + 迁移
cd backend
pnpm install
docker compose up -d postgres
pnpm db:migrate       # 迁移文件已随仓库提供，直接执行；仅改 schema 后才需 db:generate
pnpm dev

# 3. 前端（另开终端）
cd ../frontend
pnpm install
pnpm dev
```

> 仓库已提供迁移文件与作者账号初始化脚本，首次启动不需要 `db:generate`。
> 作者账号：`cd backend && pnpm create-admin <email> <name> <password>`。

## 功能

- **前台**：首页/列表（vanBlog 风格文章卡片）、详情（目录 TOC、代码复制、阅读进度、上下篇）、深浅主题、中英双语
- **编辑器**：ByteMD（vanBlog 同款内核）—— GFM / 数学公式 / 代码高亮 / 图片上传（本地 uploads/，经 /uploads/* 访问）
- **写作台**：`/write` 独立后台布局（侧边栏），含概览统计、文章管理、草稿箱、分栏 Markdown 编辑器，仅管理员可见
  - `/write` 概览 · `/write/articles` 文章管理 · `/write/drafts` 草稿箱 · `/write/new` 新建
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
