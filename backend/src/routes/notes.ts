/**
 * 笔记路由模块：公开读取（列表/详情/标签）与管理端 CRUD。
 *
 * 公开接口只返回 published；写入接口全部挂 requireAdmin 守卫（唯一安全边界）。
 */
import type { FastifyInstance } from 'fastify';
import { createNoteSchema, noteListQuerySchema, updateNoteSchema } from '../contract';
import { requireAdmin } from '../lib/context';
import { parseBody, parseParams, parseQuery } from '../middleware/validation';
import * as noteService from '../services/note.service';
import { z } from 'zod';

const idParam = z.object({ id: z.string().min(1) });
const slugParam = z.object({ slug: z.string().min(1) });

export async function noteRoutes(app: FastifyInstance) {
  // ---- 公开接口 ----
  app.get('/notes', async (req) => {
    const query = parseQuery(noteListQuerySchema, req);
    return noteService.listNotes(query, true);
  });

  app.get('/notes/:slug', async (req) => {
    const { slug } = parseParams(slugParam, req);
    return noteService.getNoteBySlug(slug, true);
  });

  app.get('/tags', async () => noteService.listTags());

  // ---- 管理接口（requireAdmin 是唯一安全边界）----
  app.get('/admin/notes', { onRequest: [requireAdmin] }, async (req) => {
    const query = parseQuery(noteListQuerySchema, req);
    return noteService.listNotes(query, false);
  });

  app.get('/admin/notes/:id', { onRequest: [requireAdmin] }, async (req) => {
    const { id } = parseParams(idParam, req);
    return noteService.getNoteById(id);
  });

  app.post('/admin/notes', { onRequest: [requireAdmin] }, async (req, reply) => {
    const input = parseBody(createNoteSchema, req);
    const note = await noteService.createNote(input);
    reply.code(201);
    return note;
  });

  app.patch('/admin/notes/:id', { onRequest: [requireAdmin] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const input = parseBody(updateNoteSchema, req);
    return noteService.updateNote(id, input);
  });

  app.delete('/admin/notes/:id', { onRequest: [requireAdmin] }, async (req, reply) => {
    const { id } = parseParams(idParam, req);
    await noteService.deleteNote(id);
    reply.code(204).send();
  });
}
