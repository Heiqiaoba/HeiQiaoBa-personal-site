# 已知问题与待办（2026-11-27）

> 记录当前线上版本遗留的小问题，按优先级排列。代码已推送，等待后续处理。

## P0：功能未生效

### 1. 操作审计日志可能为空

**现象**：后台「操作日志」页面（`写作台 → 操作日志`）查询 `/api/v1/admin/audit-logs` 返回 `[]`，即使刚做过新建权限、改角色等管理操作。

**原因**：`backend/src/routes/rbac.ts` 里的 `onResponse` 钩子通过 `path.includes('/admin/')` 判断是否记录，代码已修复（提交 `6fd374a`，把 `startsWith('/admin/')` 改为 `includes('/admin/')`），但最后一次线上验证被打断，**尚未确认重启后是否生效**。

**验证方法**：
1. 等 Render 部署完成（可用 `/api/v1/health` 的 `uptime` 判断刚重启过）
2. 用管理员登录，随便新建一个权限
3. `GET /api/v1/admin/audit-logs`，应能看到刚做的 `POST /api/v1/admin/permissions` 记录

**若仍为空**：检查钩子是否被注册在 `/api/v1` 子路由作用域内、以及 `req.auth` 是否在 `onResponse` 阶段仍可读（必要时改为在各写接口里显式调用 `audit()`）。

## P1：待完善的小问题

### 2. Giscus 评论未启用

**现象**：详情页没有评论区。

**原因**：后端环境变量 `GISCUS_REPO` 等 4 项未填写（未配置时组件静默隐藏，属预期行为）。配置已支持运行时生效，无需重新构建前端。

**处理**：在 https://giscus.app 生成 4 个值，填到 Render 环境变量并重启服务：
```
GISCUS_REPO=Heiqiaoba/xxx
GISCUS_REPO_ID=R_xxx
GISCUS_CATEGORY=Announcements
GISCUS_CATEGORY_ID=DIC_xxx
```

### 3. 图片仍存本地（R2 未配置）

**现象**：`uploads/` 在 Render 容器内，重新部署/重启后图片会丢。

**原因**：`S3Storage` 已实现（提交 `f62da41`），但未填 `STORAGE_DRIVER=s3` 和 5 个 `S3_*` 环境变量，默认仍走 `local`。

**处理**：在 Cloudflare R2 建 bucket，填 Render 环境变量：
```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=...
```

### 4. 埋点看板有个重复文案

**现象**：看板顶部显示「事件总量: X · 保留天数: 90天」，与下面统计卡片里的「事件总数」重复。

**处理**：可在 `frontend/src/routes/admin/Analytics.tsx` 移除顶部 usage 行，只保留卡片（非功能问题）。

## P2：已知限制（非 bug）

- **workers.dev 从我本地网络超时**：验证时我这边 curl 到 `*.workers.dev` 经常超时，是网络环境问题，用户浏览器正常。所有线上验证均以 Render 直连地址为准。
- **Render 免费层冷启动**：15 分钟无请求后休眠，首次访问 30~50 秒，前端已有唤醒提示。
- **管理员密码**：当前 `admin@heiqiaoba.com` 密码由用户自行修改为 `admin@123456`（旧密码 `eo9pWnWdpodPwyr4` 已失效，原因是我做改密端点验证时触发了重新哈希）。
- **审计测试数据**：线上 `permissions` 表有测试期间创建的 `audit:probe` / `audit:test` 等记录（可删，`audit:probe2` 是最后一次验证时创建的）；本地测试库有 `test_guest` 角色。
- **旧 roadmap 已过时**：`docs/roadmap.md` 第六节仍说 sitemap 是静态的，实际已在提交 `2a688a4` 改为后端动态生成。

## 最近相关提交

| 提交 | 内容 |
|---|---|
| `6fd374a` | 修复审计钩子路径匹配（待验证） |
| `f5c8b28` | 修复 public-config 挂载路径（已验证 200） |
| `f62da41` | S3/R2 存储、埋点清理、审计日志、新权限 |
| `3a7ae5d` | 阅读量去重、运行时评论配置、收藏、搜索高亮 |
| `2a688a4` | 动态 sitemap / robots |
