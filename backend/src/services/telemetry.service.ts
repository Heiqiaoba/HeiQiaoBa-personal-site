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
  const dailyRows = await db
    .select({
      date: sql<string>`to_char(${schema.telemetryEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(schema.telemetryEvents)
    .where(where)
    .groupBy(sql`date_trunc('day', ${schema.telemetryEvents.createdAt} at time zone 'UTC')`)
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
