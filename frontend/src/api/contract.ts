/**
 * 业务契约（Zod schema + 推导类型）
 * 前后端各持一份；如需同步，请同时更新 frontend/src/api/contract.ts。
 *
 * 只包含本项目实际使用的契约：错误响应、埋点、笔记。
 */
import { z } from 'zod';

/** 统一错误响应结构：所有非 2xx 响应都遵循此形状，requestId 与日志关联 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * 埋点事件契约。
 * 隐私约定：只采集页面路径（不含 query）、匿名 sessionId 与标量属性；
 * userId 由后端在已登录时从会话补全，前端不得伪造。
 */
export const telemetryEventSchema = z.object({
  /** 事件类型，如 page_view / note_view / api_error / js_error */
  type: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
  path: z.string().max(500),
  sessionId: z.string().min(1).max(100),
  userId: z.string().optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

/** 批量上报请求体：一次最多 100 条，与前端 MAX_BATCH 保持一致 */
export const telemetryBatchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(100),
});
export type TelemetryBatch = z.infer<typeof telemetryBatchSchema>;

// ============================================================
// 笔记（Notes）契约
// ============================================================

/** 笔记发布状态：draft 仅 admin 可见，published 公开 */
export const noteStatusSchema = z.enum(['draft', 'published']);
export type NoteStatus = z.infer<typeof noteStatusSchema>;

/** 对外暴露的笔记结构 */
export const noteSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  status: noteStatusSchema,
  viewCount: z.number().int().default(0),
  likeCount: z.number().int().default(0),
  tags: z.array(z.string()),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Note = z.infer<typeof noteSchema>;

/** 新建笔记输入 */
export const createNoteSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug 只能包含小写字母、数字和连字符'),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).default(''),
  content: z.string().min(1),
  status: noteStatusSchema.default('draft'),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/**
 * 更新笔记输入：字段均可选，且不带默认值。
 * 不能用 createNoteSchema.partial()：.default() 在 .partial() 后仍会生效，
 * 导致只传 status 的 PATCH 把 tags 重置为 []。
 */
export const updateNoteSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().min(1).optional(),
  status: noteStatusSchema.optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

/** 列表查询参数（分页/搜索/筛选/排序全部在后端完成） */
export const noteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tag: z.string().optional(),
  status: z.enum(['published', 'draft']).optional(),
  keyword: z.string().max(100).optional(),
  sortBy: z.enum(['publishedAt', 'createdAt', 'updatedAt', 'title']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type NoteListQuery = z.infer<typeof noteListQuerySchema>;
