/**
 * 笔记业务层：Notes 的查询与写操作，含标签同步与发布状态约束。
 *
 * 公开查询只返回 status=published；管理端查询返回全部。
 * 标签以名称存储，写入时按名称复用/创建 tag，并重建 note_tags 关联。
 */
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { CreateNoteInput, Note, NoteListQuery, UpdateNoteInput } from '../contract.js';
import { db, schema } from '../db/index.js';
import { Errors } from '../lib/errors.js';

type NoteRow = typeof schema.notes.$inferSelect;

/** DB 行 → API DTO（含标签与点赞数） */
function toDTO(row: NoteRow, tagNames: string[], likeCount = 0): Note {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    status: row.status as Note['status'],
    viewCount: row.viewCount,
    likeCount,
    tags: tagNames,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 批量统计笔记点赞数 */
async function likeCountsForNotes(noteIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!noteIds.length) return result;
  const rows = await db
    .select({ noteId: schema.likes.noteId, count: sql<number>`count(*)::int` })
    .from(schema.likes)
    .where(inArray(schema.likes.noteId, noteIds))
    .groupBy(schema.likes.noteId);
  for (const row of rows) result.set(row.noteId, row.count);
  return result;
}

/** 批量取笔记对应的标签名 */
async function tagsForNotes(noteIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!noteIds.length) return result;
  const rows = await db
    .select({ noteId: schema.noteTags.noteId, name: schema.tags.name })
    .from(schema.noteTags)
    .innerJoin(schema.tags, eq(schema.noteTags.tagId, schema.tags.id))
    .where(inArray(schema.noteTags.noteId, noteIds));
  for (const row of rows) {
    const list = result.get(row.noteId) ?? [];
    list.push(row.name);
    result.set(row.noteId, list);
  }
  return result;
}

/**
 * 列表查询（全部在 SQL 层完成过滤/搜索/排序/分页）：
 * - publicOnly=true：强制只看 published，忽略传入的 status
 * - 管理端：可按 status 精确过滤（文章管理=全部、草稿箱=draft）
 * - keyword：ILIKE 模糊匹配标题/摘要/正文
 * - sortBy + sortOrder：动态排序，title 用 collate 忽略大小写
 */
export async function listNotes(query: NoteListQuery, publicOnly: boolean) {
  const conditions: SQL[] = [publicOnly ? eq(schema.notes.status, 'published') : sql`true`];

  // 状态过滤（仅管理端生效）
  if (!publicOnly && query.status) {
    conditions.push(eq(schema.notes.status, query.status));
  }

  // 标签过滤（精确匹配标签名）
  if (query.tag) {
    const tagged = db
      .select({ noteId: schema.noteTags.noteId })
      .from(schema.noteTags)
      .innerJoin(schema.tags, eq(schema.noteTags.tagId, schema.tags.id))
      .where(eq(schema.tags.name, query.tag));
    conditions.push(inArray(schema.notes.id, tagged));
  }

  // 关键词搜索：标题 / 摘要 / 正文
  if (query.keyword?.trim()) {
    const kw = `%${query.keyword.trim()}%`;
    conditions.push(
      or(
        ilike(schema.notes.title, kw),
        ilike(schema.notes.summary, kw),
        ilike(schema.notes.content, kw),
      )!,
    );
  }

  const where = and(...conditions);

  // 排序字段白名单（契约已校验，这里再做一次映射 defense-in-depth）
  const sortColumn =
    query.sortBy === 'title'
      ? sql`lower(${schema.notes.title})`
      : query.sortBy === 'updatedAt'
        ? schema.notes.updatedAt
        : query.sortBy === 'createdAt'
          ? schema.notes.createdAt
          : schema.notes.publishedAt;
  const orderFn = query.sortOrder === 'asc' ? asc : desc;
  // 次要排序：按 id 保证分页稳定性，避免同值字段导致记录漂移
  const orderBy = [orderFn(sortColumn), desc(schema.notes.id)];

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.notes)
    .where(where);
  const count = countRows[0]?.count ?? 0;
  const rows = await db
    .select()
    .from(schema.notes)
    .where(where)
    .orderBy(...orderBy)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);
  const tagMap = await tagsForNotes(rows.map((r) => r.id));
  const likeMap = await likeCountsForNotes(rows.map((r) => r.id));
  return {
    items: rows.map((r) => toDTO(r, tagMap.get(r.id) ?? [], likeMap.get(r.id) ?? 0)),
    total: count,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** 按 slug 查询；publicOnly=true 时草稿不可见（返回 404） */
export async function getNoteBySlug(slug: string, publicOnly: boolean): Promise<Note> {
  const [row] = await db.select().from(schema.notes).where(eq(schema.notes.slug, slug)).limit(1);
  if (!row || (publicOnly && row.status !== 'published')) throw Errors.notFound('Note not found');
  const tagMap = await tagsForNotes([row.id]);
  const likeMap = await likeCountsForNotes([row.id]);
  return toDTO(row, tagMap.get(row.id) ?? [], likeMap.get(row.id) ?? 0);
}

/**
 * 阅读量 +1（按访客去重）：同一 visitorId 24 小时内只读计数一次。
 * 用唯一索引 + onConflictDoNothing 保证并发下也只计一次。
 */
export async function incrementViewCount(id: string, visitorId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const record = await db
    .insert(schema.noteViews)
    .values({ id: crypto.randomUUID(), noteId: id, visitorId })
    .onConflictDoNothing({ target: [schema.noteViews.noteId, schema.noteViews.visitorId] })
    .returning({ id: schema.noteViews.id });

  // 已有记录：超过 24 小时则更新时间并重新计数；24 小时内则跳过
  if (record.length === 0) {
    const updated = await db
      .update(schema.noteViews)
      .set({ createdAt: new Date() })
      .where(
        and(
          eq(schema.noteViews.noteId, id),
          eq(schema.noteViews.visitorId, visitorId),
          sql`${schema.noteViews.createdAt} < ${cutoff}`,
        ),
      )
      .returning({ id: schema.noteViews.id });
    if (updated.length === 0) return;
  }

  await db
    .update(schema.notes)
    .set({ viewCount: sql`${schema.notes.viewCount} + 1` })
    .where(eq(schema.notes.id, id));
}

/** 重建某笔记的标签关联 */
async function syncTags(noteId: string, tagNames: string[]) {
  await db.delete(schema.noteTags).where(eq(schema.noteTags.noteId, noteId));
  for (const name of tagNames) {
    let [tag] = await db.select().from(schema.tags).where(eq(schema.tags.name, name)).limit(1);
    if (!tag) {
      const id = crypto.randomUUID();
      await db.insert(schema.tags).values({ id, name });
      tag = { id, name };
    }
    await db.insert(schema.noteTags).values({ noteId, tagId: tag.id });
  }
}

/** 新建笔记 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const id = crypto.randomUUID();
  const now = new Date();
  const publishedAt = input.status === 'published' ? now : null;
  await db.insert(schema.notes).values({
    id,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    content: input.content,
    status: input.status,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  });
  await syncTags(id, input.tags);
  return getNoteBySlug(input.slug, false);
}

/** 更新笔记 */
export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const [existing] = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).limit(1);
  if (!existing) throw Errors.notFound('Note not found');
  const patch: Partial<typeof schema.notes.$inferInsert> = { updatedAt: new Date() };
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.title !== undefined) patch.title = input.title;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.content !== undefined) patch.content = input.content;
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === 'published' && !existing.publishedAt) patch.publishedAt = new Date();
  }
  await db.update(schema.notes).set(patch).where(eq(schema.notes.id, id));
  if (input.tags !== undefined) await syncTags(id, input.tags);
  const [updated] = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).limit(1);
  const tagMap = await tagsForNotes([id]);
  const likeMap = await likeCountsForNotes([id]);
  return toDTO(updated!, tagMap.get(id) ?? [], likeMap.get(id) ?? 0);
}

/** 删除笔记（关联标签会自动级联删除） */
export async function deleteNote(id: string): Promise<void> {
  const [row] = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).limit(1);
  if (!row) throw Errors.notFound('Note not found');
  await db.delete(schema.notes).where(eq(schema.notes.id, id));
}

/** 按 id 取笔记（管理端用） */
export async function getNoteById(id: string): Promise<Note> {
  const [row] = await db.select().from(schema.notes).where(eq(schema.notes.id, id)).limit(1);
  if (!row) throw Errors.notFound('Note not found');
  const tagMap = await tagsForNotes([id]);
  const likeMap = await likeCountsForNotes([id]);
  return toDTO(row, tagMap.get(id) ?? [], likeMap.get(id) ?? 0);
}

/**
 * 切换点赞：同一 noteId + userId 已有点赞则取消，否则新增。
 * 返回 { liked, likeCount }。userId 由客户端生成并持久化（登录前后稳定）。
 */
export async function toggleLike(noteId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const [note] = await db.select().from(schema.notes).where(eq(schema.notes.id, noteId)).limit(1);
  if (!note || note.status !== 'published') throw Errors.notFound('Note not found');

  const existing = await db
    .select({ id: schema.likes.id })
    .from(schema.likes)
    .where(and(eq(schema.likes.noteId, noteId), eq(schema.likes.userId, userId)))
    .limit(1);

  if (existing.length) {
    await db.delete(schema.likes).where(eq(schema.likes.id, existing[0]!.id));
  } else {
    await db.insert(schema.likes).values({ id: crypto.randomUUID(), noteId, userId });
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.likes)
    .where(eq(schema.likes.noteId, noteId));
  return { liked: !existing.length, likeCount: countRows[0]?.count ?? 0 };
}

/** 查询某访客是否已点赞（供详情页展示按钮状态） */
export async function hasLiked(noteId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.likes.id })
    .from(schema.likes)
    .where(and(eq(schema.likes.noteId, noteId), eq(schema.likes.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** 标签列表（含笔记计数，仅已发布） */
export async function listTags() {
  return db
    .select({ name: schema.tags.name, count: sql<number>`count(*)::int` })
    .from(schema.tags)
    .innerJoin(schema.noteTags, eq(schema.noteTags.tagId, schema.tags.id))
    .innerJoin(schema.notes, eq(schema.notes.id, schema.noteTags.noteId))
    .where(eq(schema.notes.status, 'published'))
    .groupBy(schema.tags.name)
    .orderBy(desc(sql`count(*)`));
}
