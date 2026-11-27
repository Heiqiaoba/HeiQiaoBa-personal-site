/**
 * 动态站点地图与 robots：
 * - GET /sitemap.xml：固定路由 + 所有已发布笔记（按 publishedAt 排序），
 *   域名取自 BETTER_AUTH_URL（前端实际域名），不再写死。
 * - GET /robots.txt：Allow all + 指向同源 sitemap。
 *
 * 由 Cloudflare Worker 把 /sitemap.xml、/robots.txt 代理到这里，
 * 所以搜索引擎看到的就是线上真实域名。
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import * as noteService from '../services/note.service.js';

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

function siteBase(): string {
  return (env.BETTER_AUTH_URL || '').replace(/\/+$/, '');
}

/** 固定路由（首页/列表/项目/关于） */
const STATIC_URLS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/notes', changefreq: 'weekly', priority: '0.8' },
  { path: '/archives', changefreq: 'weekly', priority: '0.7' },
  { path: '/projects', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
];

export async function sitemapRoutes(app: FastifyInstance) {
  app.get('/sitemap.xml', async (_req, reply: FastifyReply) => {
    const base = siteBase();
    const { items } = await noteService.listNotes(
      { page: 1, pageSize: 100, sortBy: 'publishedAt', sortOrder: 'desc' },
      true,
    );

    const entry = (path: string, changefreq: string, priority: string, lastmod?: string) =>
      `  <url>\n    <loc>${escapeXml(base + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

    const urls = [
      ...STATIC_URLS.map((s) => entry(s.path, s.changefreq, s.priority)),
      ...items.map((n) =>
        entry(
          `/notes/${encodeURIComponent(n.slug)}`,
          'monthly',
          '0.7',
          new Date(n.updatedAt).toISOString().slice(0, 10),
        ),
      ),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    reply.type('application/xml; charset=utf-8');
    return xml;
  });

  app.get('/robots.txt', async (_req, reply: FastifyReply) => {
    const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteBase()}/sitemap.xml\n`;
    reply.type('text/plain; charset=utf-8');
    return body;
  });
}
