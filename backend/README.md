# Fullstack Backend（黑巧巴笔记）

本项目后端：Node 22 + Fastify 5 + Drizzle ORM + PostgreSQL 16 + Better Auth。
仓库：https://github.com/Heiqiaoba/HeiQiaoBa-personal-site （`backend/` 目录）

> 本仓库由全栈模板裁剪而来，已移除演示业务；以下是本项目实际配置。

## 快速开始

```bash
cp .env.example .env
# 把 BETTER_AUTH_SECRET 换成强随机值：openssl rand -base64 32
pnpm install

# 数据库（docker-compose.yml 已配置，端口 5433）
docker compose up -d postgres

pnpm db:migrate       # 迁移文件已随仓库提供
pnpm create-admin <email> <name> <password>   # 关闭公开注册后，用此脚本创建作者账号
pnpm dev              # http://localhost:3100
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器（tsx watch，端口 3100） |
| `pnpm build` / `pnpm start` | 编译 / 启动生产服务 |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | 类型检查 / 检查 / 格式化 |
| `pnpm test` | 运行测试（读取 `.env.test`，需 app_test 库） |
| `pnpm db:generate` | schema 变更后生成新迁移 |
| `pnpm db:migrate` | 执行迁移 |
| `pnpm create-admin <email> <name> <password>` | 创建/更新作者账号（role=admin） |
| `pnpm set-role <email> [admin\|user]` | 按邮箱改角色（一般无需，create-admin 已处理） |
| `pnpm openapi:export` | 导出 OpenAPI 规范到 `openapi.json` |

## 注意

- **公开注册已关闭**，`/api/auth/sign-up/email` 会返回 400；账号由 `create-admin` 创建。
- 图片上传：`POST /api/v1/upload`（需 admin），文件写入 `uploads/`（已 gitignore），通过 `/uploads/*` 静态访问。
- 测试库 `app_test` 首次需要迁移：`DATABASE_URL=postgres://postgres:postgres@localhost:5433/app_test pnpm db:migrate`。
- API 文档：开发环境 `ENABLE_DOCS=true` 时访问 `http://localhost:3100/docs`。
