/**
 * 业务数据模型定义（Drizzle + PostgreSQL）。
 *
 * 包含笔记相关的三张表（notes / tags / note_tags）与 Better Auth 认证表。
 * 新增表后执行 pnpm db:generate 生成迁移。
 */
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import * as auth from './auth-schema.js';

/** 笔记正文表 */
export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    content: text('content').notNull(),
    status: text('status').notNull().default('draft'),
    viewCount: integer('view_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('notes_status_idx').on(table.status)],
);

/** 标签表：name 唯一 */
export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

/** 笔记-标签关联（多对多） */
export const noteTags = pgTable(
  'note_tags',
  {
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('note_tags_unique').on(table.noteId, table.tagId)],
);

/**
 * 点赞表：一个用户对一篇笔记只能赞一次（uniqueIndex 保证）。
 * userId/userId 为匿名访客生成的稳定标识（存 localStorage），无需登录即可点赞。
 */
export const likes = pgTable(
  'likes',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('likes_note_user_unique').on(table.noteId, table.userId),
    index('likes_note_idx').on(table.noteId),
  ],
);

/**
 * 埋点事件表：看板的数据源。
 * 只存脱敏后的字段（路径不含 query、标量 props），登录用户的 userId 由后端补全。
 */
export const telemetryEvents = pgTable(
  'telemetry_events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    path: text('path').notNull(),
    sessionId: text('session_id').notNull(),
    userId: text('user_id'),
    props: jsonb('props').$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('telemetry_type_idx').on(table.type),
    index('telemetry_created_idx').on(table.createdAt),
  ],
);

export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;

// 认证相关表从 auth-schema 统一导出
export const users = auth.user;
export const sessions = auth.session;
export const accounts = auth.account;
export const verifications = auth.verification;

export type UserRow = typeof auth.user.$inferSelect;
export type NewUserRow = typeof auth.user.$inferInsert;
