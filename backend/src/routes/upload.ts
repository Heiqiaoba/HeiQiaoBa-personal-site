/**
 * 图片上传路由（挂在 /api/v1 下）：管理端上传图片到本地 uploads/ 目录。
 * 静态访问由 app.ts 在根路径注册 /uploads/*。
 * 仅管理员可用，文件类型与大小有限制，文件名用 UUID 防止覆盖与路径穿越。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../lib/context';
import { Errors } from '../lib/errors';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

function extOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) ? ext : '.png';
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { onRequest: [requireAdmin] }, async (req) => {
    const data = await req.file();
    if (!data) throw Errors.badRequest('No file uploaded');
    if (!ALLOWED.has(data.mimetype)) throw Errors.badRequest('Unsupported image type');
    const buffer = await data.toBuffer();
    if (buffer.byteLength > MAX_SIZE) throw Errors.badRequest('File too large (max 5MB)');
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}${extOf(data.filename)}`;
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return { url: `/uploads/${filename}` };
  });
}
