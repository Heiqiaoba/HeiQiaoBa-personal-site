/**
 * 埋点看板（仅管理员）：概览卡片 + 事件分布 + 每日趋势 + 热门页面 + 最近事件。
 * 图表用纯 CSS/SVG 绘制，避免引入额外图表库。
 */
import { useI18n } from '@/i18n';
import { useTelemetryDashboard } from '@/api/telemetry';
import { Select, Spin, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

const EVENT_COLORS: Record<string, string> = {
  page_view: '#1772b4',
  note_view: '#13a8a8',
  api_error: '#e8684a',
  js_error: '#d4380d',
  unhandled_rejection: '#cf1322',
};

export function Analytics() {
  const { t } = useI18n();
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useTelemetryDashboard(days);

  const stats = [
    { label: t('analytics.total'), value: (data?.summary.total ?? 0).toLocaleString() },
    { label: t('analytics.visitors'), value: (data?.summary.visitors ?? 0).toLocaleString() },
    { label: t('analytics.days'), value: String(days) },
    { label: 'page_view', value: (data?.byType.find((x) => x.type === 'page_view')?.count ?? 0).toLocaleString() },
  ];
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.count) ?? []));
  const maxType = Math.max(1, ...(data?.byType.map((x) => x.count) ?? []));

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={2} className="!mb-1">{t('analytics.title')}</Title>
          <Paragraph type="secondary" className="!mb-0">{t('analytics.subtitle')}</Paragraph>
        </div>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { value: 1, label: `1 ${t('analytics.days')}` },
            { value: 7, label: `7 ${t('analytics.days')}` },
            { value: 30, label: `30 ${t('analytics.days')}` },
          ]}
          className="!w-40"
        />
      </div>

      {isLoading && <div className="p-16 text-center"><Spin /></div>}
      {isError && <Paragraph type="danger">{t('analytics.empty')}</Paragraph>}

      {data && (
        <>
          <div className="mb-4 text-xs text-[color:var(--text-muted)]">
            {t('analytics.usage')}: {data.usage?.total ?? 0} · {t('analytics.retention')}: {data.usage?.retentionDays ?? 90}{t('analytics.days')}
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 每日趋势 */}
            <section>
              <Title level={4} className="!mb-4">{t('analytics.daily')}</Title>
              <div className="rounded-xl border border-[color:var(--border)] bg-white p-5">
                {data.daily.length === 0 && <Text type="secondary">{t('analytics.empty')}</Text>}
                <div className="flex h-48 items-end gap-1">
                  {data.daily.map((d) => (
                    <div key={d.date} className="group flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                      <span className="text-[10px] text-gray-400">{d.count || ''}</span>
                      <div
                        className="w-full rounded-t bg-[color:var(--brand)] opacity-80 group-hover:opacity-100"
                        style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
                      />
                      <span className="text-[9px] text-gray-300">{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 事件分布 */}
            <section>
              <Title level={4} className="!mb-4">{t('analytics.byType')}</Title>
              <div className="rounded-xl border border-[color:var(--border)] bg-white p-5">
                {data.byType.length === 0 && <Text type="secondary">{t('analytics.empty')}</Text>}
                <div className="space-y-3">
                  {data.byType.map((x) => (
                    <div key={x.type}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: EVENT_COLORS[x.type] ?? '#888' }} />
                          <code className="text-xs">{x.type}</code>
                        </span>
                        <Text className="!text-xs !text-gray-500">{x.count}</Text>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(x.count / maxType) * 100}%`, background: EVENT_COLORS[x.type] ?? '#888' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* 热门页面 */}
          <section className="mt-8">
            <Title level={4} className="!mb-4">{t('analytics.topPaths')}</Title>
            <div className="rounded-xl border border-[color:var(--border)] bg-white p-5">
              {data.topPaths.length === 0 && <Text type="secondary">{t('analytics.empty')}</Text>}
              <div className="space-y-2">
                {data.topPaths.map((p, i) => (
                  <div key={p.path} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-xs tabular-nums text-gray-300">{i + 1}</span>
                    <code className="min-w-0 flex-1 truncate text-xs">{p.path}</code>
                    <Tag>{p.count}</Tag>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 最近事件 */}
          <section className="mt-8">
            <Title level={4} className="!mb-4">{t('analytics.recent')}</Title>
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                dataSource={data.recent}
                locale={{ emptyText: t('analytics.empty') }}
                columns={[
                  {
                    title: t('analytics.byType'),
                    dataIndex: 'type',
                    width: 150,
                    render: (v: string) => (
                      <Tag color={EVENT_COLORS[v] ? undefined : 'default'} style={EVENT_COLORS[v] ? { background: EVENT_COLORS[v], color: '#fff', borderColor: EVENT_COLORS[v] } : undefined}>
                        {v}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Path',
                    dataIndex: 'path',
                    render: (v: string) => <code className="text-xs">{v}</code>,
                  },
                  {
                    title: 'Time',
                    dataIndex: 'createdAt',
                    width: 180,
                    render: (v: string) => <Text className="!text-xs !text-gray-500">{new Date(v).toLocaleString()}</Text>,
                  },
                ]}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
