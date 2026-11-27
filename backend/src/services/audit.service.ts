/**
 * 操作审计服务：记录敏感管理操作，供后台查看。
 * 写入失败不影响主操作（审计是辅助能力，不能让业务因日志失败而回滚）。
 */
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export async function audit(
  actorId: string | undefined,
  action: string,
  target: string,
  detail?: Record<string, unknown>,
) {
  try {
    let actorEmail: string | null = null;
    if (actorId) {
      const [u] = await db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, actorId))
        .limit(1);
      actorEmail = u?.email ?? null;
    }
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      actorId: actorId ?? null,
      actorEmail,
      action,
      target,
      detail: detail ?? null,
    });
  } catch {
    // 审计失败静默：不影响主操作
  }
}

export async function listAuditLogs(limit = 100) {
  const rows = await db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(Math.min(limit, 200));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
