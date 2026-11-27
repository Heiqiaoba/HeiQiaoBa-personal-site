/**
 * 埋点看板业务层：把 telemetry_events 聚合成概览卡片、趋势与热门页面。
 *
 * 所有查询限定在最近 N 天内；统计口径：
 * - total：区间内事件总数；uniqueVisitors：去重 sessionId；
 * - byType：按事件类型分组计数；
 * - daily：按天聚合（UTC 日期），前端展示用；
 * - topPaths：访问量最高的页面（page_view）；
 * - recent：最近 N 条事件明细（脱敏字段）。
 */
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import type { TelemetryQuery } from '../contract.js';
import { db, schema } from '../db/index.js';

/** 埋点保留天数 */
export const TELEMETRY_RETENTION_DAYS = 90;

/** 删除超过保留期的埋点事件，返回删除条数。每次服务启动时调用一次。 */
export async function cleanupTelemetry(): Promise<number> {
  const cutoff = new Date(Date.now() - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(schema.telemetryEvents)
    .where(sql`${schema.telemetryEvents.createdAt} < ${cutoff}`)
    .returning({ id: schema.telemetryEvents.id });
  return deleted.length;
}

/** 埋点存储用量（总条数与最早时间） */
export async function telemetryUsage() {
  const [row] = await db
    .select({ total: count(), oldest: sql<Date>`min(${schema.telemetryEvents.createdAt})` })
    .from(schema.telemetryEvents);
  return {
    total: row?.total ?? 0,
    retentionDays: TELEMETRY_RETENTION_DAYS,
    oldest: row?.oldest ? new Date(row.oldest).toISOString() : null,
  };
}

/** 取 N 天前的起点（含当天 00:00 UTC） */
function since(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

export async function getDashboard(query: TelemetryQuery) {
  const from = since(query.days);
  const where = gte(schema.telemetryEvents.createdAt, from);

  // 汇总：总数 + 独立访客（按 sessionId 去重）
  const [summary] = await db
    .select({
      total: count(),
      visitors: sql<number>`count(distinct ${schema.telemetryEvents.sessionId})::int`,
    })
    .from(schema.telemetryEvents)
    .where(where);

  // 按事件类型分组
  const byTypeRows = await db
    .select({ type: schema.telemetryEvents.type, count: count() })
    .from(schema.telemetryEvents)
    .where(where)
    .groupBy(schema.telemetryEvents.type)
    .orderBy(desc(count()));

  // 按天聚合
  // SELECT 与 GROUP BY 必须用同一表达式，否则 Postgres 会拒绝（created_at 未出现在 GROUP BY）。
  // 先 date_trunc 到天，再 to_char 格式化，两者共享 date_trunc 表达式。
  const dayExpr = sql`date_trunc('day', ${schema.telemetryEvents.createdAt} at time zone 'UTC')`;
  const dailyRows = await db
    .select({
      date: sql<string>`to_char(${dayExpr}, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(schema.telemetryEvents)
    .where(where)
    .groupBy(dayExpr)
    .orderBy(sql`1`);

  // 热门页面（仅 page_view）
  const topPathRows = await db
    .select({ path: schema.telemetryEvents.path, count: count() })
    .from(schema.telemetryEvents)
    .where(and(where, eq(schema.telemetryEvents.type, 'page_view')))
    .groupBy(schema.telemetryEvents.path)
    .orderBy(desc(count()))
    .limit(10);

  // 最近事件明细
  const recentRows = await db
    .select()
    .from(schema.telemetryEvents)
    .where(where)
    .orderBy(desc(schema.telemetryEvents.createdAt))
    .limit(query.limit);

  return {
    summary: {
      total: summary?.total ?? 0,
      visitors: summary?.visitors ?? 0,
      days: query.days,
    },
    byType: byTypeRows,
    daily: dailyRows,
    topPaths: topPathRows,
    recent: recentRows.map((r) => ({
      id: r.id,
      type: r.type,
      path: r.path,
      sessionId: r.sessionId,
      props: r.props,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
