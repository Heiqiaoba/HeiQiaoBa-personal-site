# 免费部署指南：Cloudflare Workers + Render + Neon

> 目标：不买域名、不买服务器，用免费额度让个人站公开可访问。
> 生产即测试环境；后端 Render 免费层会休眠，首次访问有 30~50 秒冷启动，属正常。

## 架构与关键点

```
访客浏览器
  │  https://<项目名>.<子域>.workers.dev
  ├─ /            → Cloudflare Worker 托管的前端静态文件（frontend/dist）
  ├─ /api/*  ─────┐
  ├─ /uploads/* ──┼─ Worker 同源反向代理 → Render 后端 → Neon 数据库
  └─ /feed.xml ───┘
```

**为什么用 Worker 代理而不是直接跨域**：本站认证是 HttpOnly Cookie + `SameSite=Lax`。如果前端和 API 不同源，浏览器视为跨域，Cookie 不会带上，会出现"登录成功但马上掉线"。代理后浏览器全程只认一个域名，Cookie 正常。

**为什么是 Workers 而不是 Pages**：Cloudflare 现在新建 Git 项目默认走 Workers Builds。本项目用 `wrangler.jsonc` 把前端当静态资源托管，同时用一个轻量 Worker（`src/index.ts`）做同源代理。这样既能自动部署，又能保留 Cookie 同源。

需要准备的免费账号：GitHub、Cloudflare、Render、Neon。

---

## 第 1 步：Neon 建数据库

1. 注册 https://neon.tech，新建 Project，区域选 `Asia Pacific (Singapore)`
2. 只开启 **Postgres database**（其余 Object storage / Functions / AI / Realtime / Better Auth 都不用）
3. 复制 **Connection string**（形如 `postgresql://user:pass@ep-xxx...neon.tech/neondb?sslmode=require`），第 3 步要用

## 第 2 步：Cloudflare Workers 部署前端

1. Cloudflare Dashboard → Workers & Pages → Create → 连接 GitHub 仓库 `Heiqiaoba/HeiQiaoBa-personal-site`
2. 构建设置：
   - **项目名称**：`heiqiaoba-personal-site`
   - **构建命令**：`cd frontend && pnpm install --frozen-lockfile && pnpm build`
   - **部署命令**：`npx wrangler deploy`
   - **预览命令**：`npx wrangler preview`（可关闭预览构建）
   - 环境变量 `NODE_VERSION=22`（如提示缺 pnpm 再加 `PNPM_VERSION=9`）
3. 部署成功后，地址形如 `https://heiqiaoba-personal-site.<子域>.workers.dev`
   - 若看到带部署 ID 前缀的 URL（如 `1352bf35-...`），那是某次构建的专属地址，对外用不带前缀的稳定地址

> 若连接 GitHub 报"无法安装在账户上"，去 https://github.com/settings/installations 卸载 Cloudflare 应用后重新授权；仓库权限选 "Only select repositories" 只勾本项目。

## 第 3 步：Render 部署后端

1. Render → New → Web Service → 连同一个 GitHub 仓库
2. 设置：
   - **Runtime**：Docker
   - **Dockerfile Path**：`backend/Dockerfile`
   - **Docker Build Context**：`./backend`
   - **Plan**：Free
3. 环境变量（可用 .env 批量导入）：

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=<第 1 步的 Neon 连接串>
BETTER_AUTH_SECRET=<openssl rand -base64 32 生成>
BETTER_AUTH_URL=<前端 workers.dev 地址>
CORS_ORIGIN=<前端 workers.dev 地址>
DB_POOL_MAX=5
ENABLE_DOCS=false
LOG_LEVEL=info
```

> ⚠️ `BETTER_AUTH_URL` / `CORS_ORIGIN` 填**前端地址**，不是 Render 地址，否则会话 Cookie 与重定向会错。

4. 部署成功后拿到后端地址，形如 `https://heiqiao-backend.onrender.com`。验证：`/api/v1/health` 返回 `{"status":"ok"}`。

数据库迁移在容器启动时自动执行（`node dist/db/migrate.js`），首次启动自动建表。

## 第 4 步：配置同源代理（BACKEND_URL）

在 Cloudflare 项目 → 设置 → 运行时变量和密钥（Variables and Secrets）添加：

- 类型选 **密钥 / Secret**（不要选文本变量）
- 名称：`BACKEND_URL`
- 值：`https://<你的后端>.onrender.com`

点**部署**生效。之后前端的 `/api`、`/uploads`、`/feed.xml` 都会转发到后端。

## 第 5 步：创建账号

站点已开放读者注册（登录页「注册」），普通用户可阅读、点赞，无写权限。作者账号需手工创建（关闭了公开提权）。

**方式 A（推荐，免费）**：Neon 控制台 → SQL Editor，执行 `create-admin` 等价 SQL（见对话记录），创建 `role=admin` 的账号。

**方式 B**：Render Shell（付费实例）执行 `node dist/db/create-admin.js <email> <name> <password>`。

**方式 C**：本地把 `DATABASE_URL` 指向 Neon 后执行同一脚本：
```bash
cd backend
DATABASE_URL='<Neon连接串>' node dist/db/create-admin.js <email> <name> '<password>'
```

创建后打开前端 `/login` 登录，进 `/write/settings` **立刻改密码**。

---

## 已实现功能验证清单

- [ ] 首页 / 笔记列表 / 详情能打开
- [ ] 注册普通账号成功，登录后仍无法进入 `/write`（前端守卫 + 后端 requireAdmin 双保险）
- [ ] 详情页点赞按钮可用，刷新后状态保持（按浏览器本地 visitorId 去重）
- [ ] 阅读量打开详情后 +1
- [ ] 埋点上报：浏览器 Network 可见 `POST /api/v1/telemetry` 返回 202（含 page_view / note_view）
- [ ] 作者账号能进后台，新建/发布/删除笔记
- [ ] 退出登录后会话状态正常（Cookie 同源成功）

> 注意：`seed.ts` 没有种子数据，首页初始为空，登录后自行发布笔记即可。

## 已知限制与后续

1. **Render 免费层休眠**：15 分钟无请求后停机，下次访问冷启动 30~50 秒，期间可能短暂 502，重试即可。介意就升级付费层（$7/月）。
2. **图片重启丢失**：`uploads/` 在 Render 容器内，重启/重新部署会清空。要持久化可实装 `S3Storage` 接 Cloudflare R2（免费 10GB），`StorageProvider` 抽象已留好。
3. **workers.dev 域名**：国内访问偶有不稳定，正式使用建议绑定自己的域名（无需备案，Cloudflare 海外节点）。
4. **数据库连接数**：Neon 免费层连接少，`DB_POOL_MAX=5` 已按此设置。

## 本项目已做的部署准备

- `wrangler.jsonc`：Worker + 静态资源 + SPA 回退 + 代理路由配置
- `src/index.ts`：同源反向代理 Worker（`/api`、`/uploads`、`/feed.xml` → `BACKEND_URL`）
- 后端启动自动迁移；ESM 产物已补 `.js` 扩展名，可被 Node 原生解析
- 生产环境 Fastify logger 用配置对象（非 Pino 实例），避免启动报错
- `BETTER_AUTH_URL` / `CORS_ORIGIN` / `BACKEND_URL` 均通过环境变量配置
- 认证 Cookie 在生产环境自动加 `secure`（`NODE_ENV=production`）
