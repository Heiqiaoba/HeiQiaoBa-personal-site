/**
 * 笔记业务层：Notes 的查询与写操作，含标签同步与发布状态约束。
 *
 * 公开查询只返回 status=published；管理端查询返回全部。
 * 标签以名称存储，写入时按名称复用/创建 tag，并重建 note_tags 关联。
 */
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { CreateNoteInput, Note, NoteListQuery, UpdateNoteInput } from '../contract';
import { db, schema } from '../db';
import { Errors } from '../lib/errors';

type NoteRow = typeof schema.notes.$inferSelect;

/** DB 行 → API DTO（含标签） */
function toDTO(row: NoteRow, tagNames: string[]): Note {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    status: row.status as Note['status'],
    viewCount: row.viewCount,
    tags: tagNames,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
  return {
    items: rows.map((r) => toDTO(r, tagMap.get(r.id) ?? [])),
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
  return toDTO(row, tagMap.get(row.id) ?? []);
}

/** 阅读量 +1（SQL 原子自增，不影响本次响应返回的计数） */
export async function incrementViewCount(id: string): Promise<void> {
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
  return toDTO(updated!, tagMap.get(id) ?? []);
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
  return toDTO(row, tagMap.get(id) ?? []);
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
