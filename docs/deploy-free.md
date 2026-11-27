# 免费部署指南：Cloudflare Pages + Render + Neon

> 目标：不买域名、不买服务器，用免费额度让个人站公开可访问。
> 生产即测试环境；后端 Render 免费层会休眠，首次访问有 30~50 秒冷启动，属正常。

## 架构与关键点

```
访客浏览器
  │  https://<你的项目>.pages.dev
  ├─ /            → Cloudflare Pages 托管的前端静态文件
  ├─ /api/*  ─────┐
  ├─ /uploads/* ──┼─ Pages _redirects 200 代理（同源）→ Render 后端 → Neon 数据库
  └─ /feed.xml ───┘
```

**为什么用 `_redirects` 代理而不是直接跨域**：本站认证是 HttpOnly Cookie + `SameSite=Lax`。如果前端在 `pages.dev`、API 在 `onrender.com`，浏览器视为跨域，Cookie 不会带上，会出现"登录成功但马上掉线"。代理后浏览器全程只认 `pages.dev`，Cookie 正常。

需要准备的免费账号：
- GitHub（已有仓库）
- Cloudflare（Pages）
- Render（后端）
- Neon（PostgreSQL）

---

## 第 1 步：Neon 建数据库

1. 注册 https://neon.tech，新建 Project，区域选离你近的（如 `Asia Pacific (Singapore)`）
2. 建好后，在控制台复制 **Connection string**（形如 `postgresql://user:pass@ep-xxx.region.neon.zone/postgres?sslmode=require`）
3. 记下它，第 3 步要用

## 第 2 步：Cloudflare Pages 部署前端

1. 登录 Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 选 GitHub 仓库 `HeiQiaoBa/HeiQiaoBa-personal-site`
3. 构建设置：
   - **Build command**: `cd frontend && pnpm install && pnpm build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: 留空（仓库根）
   - Node 版本：`22`（在 Environment variables 里加 `NODE_VERSION=22`）
4. 先直接部署（后端还没好，前端页面能开即可）
5. 拿到前端域名，形如 `https://heiqiaoba-personal-site.pages.dev`

### 配置同源代理

编辑仓库里 [`frontend/public/_redirects`](../frontend/public/_redirects)，把 `BACKEND_URL` 替换成第 3 步拿到的 Render 地址（不带末尾 `/`），提交后 Pages 自动重新部署。

---

## 第 3 步：Render 部署后端

1. 注册 https://render.com，New → Web Service → 连同一个 GitHub 仓库
2. 设置：
   - **Runtime**: Docker
   - **Dockerfile path**: `backend/Dockerfile`
   - **Docker build context**: `./backend`（若 Render 不支持子目录 context，见下方替代方案）
   - **Plan**: Free
3. 环境变量（Environment）：

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | 第 1 步 Neon 连接串 |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` 生成 |
| `BETTER_AUTH_URL` | **前端 Pages 域名**，如 `https://xxx.pages.dev` |
| `CORS_ORIGIN` | 同前端 Pages 域名 |
| `ENABLE_DOCS` | `false` |
| `DB_POOL_MAX` | `5`（Neon 免费层连接数少） |
| `LOG_LEVEL` | `info` |

> ⚠️ `BETTER_AUTH_URL` 一定要填**前端域名**（不是 Render 的 `onrender.com` 域名），否则会话 Cookie 与重定向会错。

4. 部署完成后拿到后端地址，形如 `https://heiqiao-backend.onrender.com`，填回第 2 步的 `_redirects`。

### 替代方案（Render 子目录 context 有问题时）

Render 对 monorepo 子目录 context 支持有限。若构建失败：
- 在 Render 用 **Native** 环境，Build command: `cd backend && pnpm install && pnpm build`，Start command: `cd backend && node dist/index.js`
- 或单独把 `backend/` 作为一个独立仓库部署

数据库迁移已在后端启动命令中执行（`node dist/db/migrate.js && node dist/index.js`），首次启动会自动建表。

---

## 第 4 步：创建作者账号

后端跑起来后，进 Render 服务的 **Shell** 标签，执行：

```bash
pnpm create-admin admin@你的邮箱.com 你的名字 '一个强密码'
```

> 如果 Shell 里 `pnpm` 不可用（Docker runtime），用 `node dist/db/create-admin.js ...`。

然后打开前端 `https://xxx.pages.dev/login` 登录，进 `/write/settings` **立刻改密码**。

---

## 第 5 步：验证清单

- [ ] `https://xxx.pages.dev` 首页能开，能看到 5 篇示例笔记
- [ ] `/notes/xxx` 详情能开，代码块复制按钮正常
- [ ] `/archives`、`/projects`、`/about`、`/feed.xml` 都能开
- [ ] 登录后台 `/write`，能新建/发布/删除笔记
- [ ] 编辑器里粘贴图片能上传并显示（图片存 Render 本地磁盘，重启会丢——见下）
- [ ] 退出登录后刷新，会话保持正常（验证 Cookie 同源成功）

---

## 已知限制与后续

1. **Render 免费层休眠**：15 分钟无请求后停机，下次访问冷启动 30~50 秒。介意的话升级付费层（$7/月）或换 Fly.io。
2. **图片重启丢失**：`uploads/` 在 Render 容器内，重启/重新部署会清空。个人测试可接受；要持久就实装 `S3Storage` 接 Cloudflare R2（免费 10GB，无出站流量费），代码里 `StorageProvider` 抽象已留好，只需实现 `put/list/remove`。
3. **数据库免费层**：Neon 免费 3GB 足够个人博客。
4. **自定义域名**：Pages 免费子域够用；想用自己的域名在 Pages 里绑定即可，无需备案（Cloudflare 海外节点）。

## 本项目已做的部署准备

- [`frontend/public/_redirects`](../frontend/public/_redirects)：同源代理规则（需填后端地址）
- 后端启动自动迁移：`node dist/db/migrate.js && node dist/index.js`
- `BETTER_AUTH_URL` / `CORS_ORIGIN` 可通过环境变量配置
- 认证 Cookie 在生产环境自动加 `secure` 属性（`NODE_ENV=production`）
