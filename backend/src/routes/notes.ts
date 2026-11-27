/**
 * 笔记路由模块：公开读取（列表/详情/标签）与管理端 CRUD。
 *
 * 公开接口只返回 published；写入接口全部挂 requireAdmin 守卫（唯一安全边界）。
 */
import type { FastifyInstance } from 'fastify';
import { createNoteSchema, likeRequestSchema, noteListQuerySchema, updateNoteSchema } from '../contract.js';
import { optionalAuth, requirePermission } from '../lib/context.js';
import { parseBody, parseParams, parseQuery } from '../middleware/validation.js';
import * as noteService from '../services/note.service.js';
import { z } from 'zod';

const idParam = z.object({ id: z.string().min(1) });
const slugParam = z.object({ slug: z.string().min(1) });

/** 点赞限流：同一 visitorId 每分钟最多 60 次，防刷；key 取 visitorId 而非 IP */
const likeRateLimit = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

export async function noteRoutes(app: FastifyInstance) {
  // ---- 公开接口 ----
  app.get('/notes', async (req) => {
    const query = parseQuery(noteListQuerySchema, req);
    return noteService.listNotes(query, true);
  });

  app.get('/notes/:slug', async (req) => {
    const { slug } = parseParams(slugParam, req);
    const note = await noteService.getNoteBySlug(slug, true);
    // 阅读量 +1（不阻塞响应语义；失败也不影响阅读）
    void noteService.incrementViewCount(note.id).catch(() => {});
    return note;
  });

  app.get('/tags', async () => noteService.listTags());

  // ---- 点赞（公开，访客无需登录；visitorId 本地生成）----
  app.post(
    '/notes/:id/like',
    { ...likeRateLimit, onRequest: [optionalAuth] },
    async (req) => {
      const { id } = parseParams(idParam, req);
      const { visitorId } = parseBody(likeRequestSchema, req);
      return noteService.toggleLike(id, visitorId);
    },
  );

  // 查询当前访客对某笔记的点赞状态（供详情页按钮展示）
  app.get('/notes/:id/like', { onRequest: [optionalAuth] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const visitorId = (req.query as { visitorId?: string }).visitorId;
    if (!visitorId) return { liked: false };
    return { liked: await noteService.hasLiked(id, visitorId) };
  });

  // ---- 管理接口（requireAdmin 是唯一安全边界）----
  app.get('/admin/notes', { onRequest: [requirePermission('note:read')] }, async (req) => {
    const query = parseQuery(noteListQuerySchema, req);
    return noteService.listNotes(query, false);
  });

  app.get('/admin/notes/:id', { onRequest: [requirePermission('note:read')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    return noteService.getNoteById(id);
  });

  app.post('/admin/notes', { onRequest: [requirePermission('note:create')] }, async (req, reply) => {
    const input = parseBody(createNoteSchema, req);
    const note = await noteService.createNote(input);
    reply.code(201);
    return note;
  });

  app.patch('/admin/notes/:id', { onRequest: [requirePermission('note:update')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const input = parseBody(updateNoteSchema, req);
    return noteService.updateNote(id, input);
  });

  app.delete('/admin/notes/:id', { onRequest: [requirePermission('note:delete')] }, async (req, reply) => {
    const { id } = parseParams(idParam, req);
    await noteService.deleteNote(id);
    reply.code(204).send();
  });
}
