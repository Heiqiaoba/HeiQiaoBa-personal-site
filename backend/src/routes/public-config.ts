/**
 * 公开运行时配置：前端启动时拉取，避免评论等可选功能改配置就要重新构建。
 * GET /api/v1/public-config → 只返回可公开的非敏感项（挂在 /api/v1 前缀下）。
 */
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export async function publicConfigRoutes(app: FastifyInstance) {
  app.get('/public-config', async () => ({
    giscus: env.GISCUS_REPO && env.GISCUS_REPO_ID && env.GISCUS_CATEGORY && env.GISCUS_CATEGORY_ID
      ? {
          repo: env.GISCUS_REPO,
          repoId: env.GISCUS_REPO_ID,
          category: env.GISCUS_CATEGORY,
          categoryId: env.GISCUS_CATEGORY_ID,
        }
      : null,
  }));
}
