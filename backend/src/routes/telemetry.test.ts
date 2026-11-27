/**
 * 埋点接收端点测试：验证匿名批量上报与请求校验。
 *
 * 断言意义：
 * - 合法事件批次无需登录即返回 202 与 accepted 数量，证明埋点路径保持用户无感；
 * - 缺少必填字段的事件被 Zod 校验拦截返回 400，确认共享契约在服务端真实生效，
 *   而非只做文档展示。
 */
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('telemetry ingest', () => {
  it('accepts a batch of valid events anonymously with 202', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry',
      payload: {
        events: [
          {
            type: 'page_view',
            timestamp: new Date().toISOString(),
            path: '/todos',
            sessionId: 'anon-session-1',
            props: { source: 'spa' },
          },
        ],
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ accepted: 1 });
    await app.close();
  });

  it('dashboard requires admin (unauthenticated gets 401)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/dashboard',
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('dashboard aggregation runs without SQL errors (via service)', async () => {
    // 回归测试：每日趋势的 SELECT/GROUP BY 曾表达式不一致导致 Postgres 42803；
    // 这里用真实测试库执行完整聚合，确保返回结构正确（测试库可能为空，也应正常返回）。
    const { getDashboard } = await import('../services/telemetry.service.js');
    const data = await getDashboard({ days: 7, limit: 50 });
    expect(data.summary.days).toBe(7);
    expect(Array.isArray(data.byType)).toBe(true);
    expect(Array.isArray(data.daily)).toBe(true);
    expect(Array.isArray(data.topPaths)).toBe(true);
    expect(Array.isArray(data.recent)).toBe(true);
  });

  it('rejects malformed events with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry',
      payload: { events: [{ type: '' }] },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
