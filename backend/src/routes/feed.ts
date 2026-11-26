/**
 * RSS 2.0 feed：/feed.xml，输出最近 20 篇已发布笔记。
 * 正文用 Markdown 原文包裹在 CDATA 中（简单可靠，阅读器可自行渲染）。
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import * as noteService from '../services/note.service';

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}

export async function feedRoutes(app: FastifyInstance) {
  app.get('/feed.xml', async (_req, reply: FastifyReply) => {
    const { items } = await noteService.listNotes(
      { page: 1, pageSize: 20, sortBy: 'publishedAt', sortOrder: 'desc' },
      true,
    );
    const base = process.env.BETTER_AUTH_URL ?? '';
    const itemsXml = items
      .map((n) => {
        const link = `${base}/notes/${encodeURIComponent(n.slug)}`;
        return `    <item>
      <title>${escapeXml(n.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(n.publishedAt ?? n.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${n.summary || n.content.slice(0, 300)}]]></description>
${n.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join('\n')}
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>黑巧巴笔记</title>
    <link>${escapeXml(base)}</link>
    <description>记录想法、项目与日常的安静角落</description>
    <language>zh-cn</language>
${itemsXml}
  </channel>
</rss>`;
    reply.type('application/rss+xml; charset=utf-8');
    return xml;
  });
}
