/**
 * 业务数据模型定义（Drizzle + PostgreSQL）。
 *
 * 骨架项目当前未定义业务表，仅统一导出 Better Auth 认证表。
 * 新增业务表时在这里声明，然后执行 pnpm db:generate 生成迁移。
 */
import * as auth from './auth-schema';

export const users = auth.user;
export const sessions = auth.session;
export const accounts = auth.account;
export const verifications = auth.verification;

export type UserRow = typeof auth.user.$inferSelect;
export type NewUserRow = typeof auth.user.$inferInsert;
