/**
 * 图片路由（挂在 /api/v1 下）：
 * - POST /upload    上传图片（admin）
 * - GET  /images    列出已上传图片（admin）
 * - DELETE /images/:name  删除图片（admin）
 *
 * 底层存储由 lib/storage 抽象（local / s3），路由层不关心具体实现。
 * 仅管理员可用，文件类型与大小有限制，文件名用 UUID 防止覆盖与路径穿越。
 */
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../lib/context';
import { Errors } from '../lib/errors';
import { storage } from '../lib/storage';
import { z } from 'zod';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
// 允许常见位图；不允许 SVG（可作为脚本载体导致存储型 XSS）
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function extOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.png';
}
import path from 'node:path';

const nameParam = z.object({ name: z.string().regex(/^[a-zA-Z0-9._-]+$/) });

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { onRequest: [requireAdmin] }, async (req) => {
    const data = await req.file();
    if (!data) throw Errors.badRequest('No file uploaded');
    if (!ALLOWED.has(data.mimetype)) throw Errors.badRequest('Unsupported image type');
    const buffer = await data.toBuffer();
    if (buffer.byteLength > MAX_SIZE) throw Errors.badRequest('File too large (max 5MB)');
    const filename = `${crypto.randomUUID()}${extOf(data.filename)}`;
    const url = await storage.put(filename, buffer, data.mimetype);
    return { url };
  });

  app.get('/images', { onRequest: [requireAdmin] }, async () => storage.list());

  app.delete('/images/:name', { onRequest: [requireAdmin] }, async (req) => {
    const { name } = nameParam.parse(req.params);
    await storage.remove(name);
    return { ok: true };
  });
}
