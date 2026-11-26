/**
 * 认证与鉴权集成测试：通过 buildApp + inject 验证 Better Auth hijack、守卫与限流配置。
 *
 * 重点断言：
 * - 未登录会话返回 session-less 响应；
 * - POST body 被 better-auth 正确读取（字段级 password 校验错误）；
 * - hijack 绕过 onSend 链，需断言手动补齐的 CORS 与 x-request-id；
 * - 管理端笔记接口（/api/v1/admin/notes）未登录返回 401；
 * - 公开笔记接口未登录可访问（返回 200 空列表）；
 * - 健康探针多次调用无 429，验证限流豁免。
 */
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

const ORIGIN = 'http://localhost:5174';

describe('auth routes', () => {
  it('GET /api/auth/get-session without cookie returns a session-less response', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/auth/get-session' });
    expect([200, 401]).toContain(res.statusCode);
    await app.close();
  });

  it('forwards POST body to better-auth handler (not consumed by Fastify parser)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'test@example.com' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('body.password');
    await app.close();
  });

  it('adds CORS headers to hijacked auth responses', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { origin: ORIGIN },
    });
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['x-request-id']).toBeTruthy();
    await app.close();
  });

  it('admin notes rejects unauthenticated request with 401', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/notes' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('public notes list is accessible without authentication', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/notes' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toBeInstanceOf(Array);
    await app.close();
  });

  it('health probes are exempt from rate limiting (no 429 under repeated calls)', async () => {
    const app = await buildApp();
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.statusCode).toBe(200);
    }
    await app.close();
  });
});
