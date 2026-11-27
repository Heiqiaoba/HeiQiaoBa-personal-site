/**
 * 站点地图与 robots 测试：
 * - sitemap 返回 XML，包含固定路由，不含写死的旧域名；
 * - robots 指向同源 sitemap。
 */
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('sitemap & robots', () => {
  it('serves an XML sitemap with static routes', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/sitemap.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('<urlset');
    expect(res.body).toContain('/notes');
    expect(res.body).toContain('/about');
    expect(res.body).not.toContain('heiqiaoba.com');
    await app.close();
  });

  it('serves robots.txt pointing to sitemap', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/robots.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('User-agent: *');
    expect(res.body).toContain('/sitemap.xml');
    await app.close();
  });
});
