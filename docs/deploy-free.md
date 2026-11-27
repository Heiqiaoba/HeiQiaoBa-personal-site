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

`BACKEND_URL` 已写在 [`wrangler.jsonc`](../wrangler.jsonc) 的 `vars` 里，**每次部署自动生效**，不需要在 Cloudflare 面板里手动添加。换后端地址时改这个文件提交即可。

> 早期版本让用户在面板里手动加 Secret，但 Workers Builds 从 Git 重新部署时可能丢失该值，现已改为代码内声明，一劳永逸。

前端的 `/api`、`/uploads`、`/feed.xml` 都会由 Worker 转发到该地址。

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
- [ ] 作者账号进后台 → 侧边栏「埋点看板」，能看到事件总数、独立访客、每日趋势、事件分布、热门页面与最近事件
- [ ] 作者账号能进后台，新建/发布/删除笔记
- [ ] 退出登录后会话状态正常（Cookie 同源成功）

### 埋点看板说明

埋点事件落在 `telemetry_events` 表（迁移 `0004` 自动建表），由 `src/lib/telemetry-sink.ts` 在接收事件时写入。看板数据在 `GET /api/v1/telemetry/dashboard?days=7`，**仅管理员可访问**（`requireAdmin` 守卫，普通用户返回 401）。看板支持 1/7/30 天区间切换，展示：

- 概览卡片：事件总数、独立访客（按 sessionId 去重）、区间天数、page_view 数
- 每日趋势柱状图、事件类型分布、热门页面 TOP10、最近事件明细

> 看板在写作台侧边栏「埋点看板」入口。埋点只记录脱敏路径（无 query）与标量 props，登录时由后端补全 userId。

### RBAC 权限体系

- **角色**：内置 `admin`（全部权限）与 `guest`（无任何管理权限，新注册用户默认此角色）；可在后台新建自定义角色
- **权限**：按钮/接口级，共 17 个内置（`note:create`、`user:role`、`permission:manage` 等），后端代码 `ALL_PERMISSIONS` 是内置权威定义；后台可再新增自定义权限
- **安全阀**：禁止降级/封禁/删除「最后一个可用管理员」（`countActiveAdmins`），防止把自己锁在门外；也不能删除自己的账号
- **校验公共方法**：后端 `requirePermission(code)` 守卫（[`lib/context.ts`](../backend/src/lib/context.ts)）+ `hasPermission(userId, code)`（[`services/rbac.service.ts`](../backend/src/services/rbac.service.ts)）；前端 `usePermissions()/Can/can()`（[`lib/permissions.tsx`](../frontend/src/lib/permissions.tsx)）
- **管理界面**：写作台 → 用户管理 / 角色管理 / 权限管理（各按钮按权限显隐；内置角色不可改删）
  - 权限支持完整增删改查（新增 `permission:manage`）；内置权限不可删/不可改 code，自定义权限可删
  - 角色编辑弹窗按分组提供「全选/取消/反选」勾选
  - 内置权限部署时幂等补齐；用户自建权限不会被覆盖
- **账户设置**：顶部导航「账户设置」（所有登录用户可见，可改密码）；旧 `/write/settings` 已指向同一页面
- 迁移 `0005` 自动建 `permissions`/`roles`/`role_permissions` 表，种子数据由 `migrate.ts` 幂等写入

### SEO：动态 sitemap 与 robots

`/sitemap.xml` 与 `/robots.txt` 由后端动态生成（[`backend/src/routes/sitemap.ts`](../backend/src/routes/sitemap.ts)），域名取 `BETTER_AUTH_URL`，包含全部已发布笔记与 lastmod；Cloudflare Worker 把这两个路径代理到后端。前端 `public/` 下的同名文件仅供本地 dev server 使用（不含旧域名和文章）。

### 冷启动无感提示（前端）

针对 Render 免费层休眠唤醒，前端内置了全局监测（`src/lib/backendWake.ts` + `components/BackendWakeMonitor.tsx`）：

- 进入页面后端正常 → **完全静默**，不打扰用户；
- 首次探测失败，或浏览中 API 返回 5xx / 网络错误 → 显示「正在唤醒站点」提示，每 3 秒探测一次（最多 60 秒）；
- 恢复后**自动刷新**之前失败的数据查询，并显示一次「站点已就绪」短暂提示；
- 超时则提示「暂时无法连接」，用户可稍后刷新。

首页底部「站点状态」也接入了同一状态源，而非各自轮询。

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

## 导入本地示例笔记（可选）

本地开发库里有 5 篇示例笔记、9 个标签和 10 条关联，线上 Neon 初始为空。若想把它们搬到线上：

1. 打开 [`docs/import-sample-notes.sql`](import-sample-notes.sql)，复制全部内容
2. Neon 控制台 → SQL Editor → 粘贴 → Run
3. 脚本幂等（`ON CONFLICT DO NOTHING`），重复执行不会覆盖已有内容

> 该 SQL 由本地 `app` 库导出，Markdown 正文用 PostgreSQL `E'...'` 转义为单行，已验证可在空库完整导入 5/9/10 条记录。
