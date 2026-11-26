/**
 * 写作台概览：统计卡片 + 最近更新 + 快捷操作（参考 vanBlog 数据概览 Tab）。
 */
import { useI18n } from '@/i18n';
import { useAdminNotes } from '@/api/notes';
import { Button, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function DeskOverview() {
  const { t } = useI18n();
  const { data } = useAdminNotes({ pageSize: 100 });
  const notes = data?.items ?? [];
  const published = notes.filter((n) => n.status === 'published').length;
  const drafts = notes.length - published;
  const words = notes.reduce((sum, n) => sum + n.content.replace(/\s/g, '').length, 0);
  const stats = [
    { label: t('desk.stat.articles'), value: notes.length },
    { label: t('desk.stat.words'), value: words.toLocaleString() },
    { label: t('desk.stat.published'), value: published },
    { label: t('desk.stat.drafts'), value: drafts },
  ];

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <Title level={2} className="!mb-6">{t('desk.overview.title')}</Title>

      {/* 统计卡片 */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* 最近更新 */}
        <section>
          <Title level={4} className="!mb-4">{t('desk.recent')}</Title>
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
            {notes.slice(0, 6).map((note, i) => (
              <Link
                key={note.id}
                to={`/write/${note.id}`}
                className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-3.5 no-underline last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-gray-300">{i + 1}</span>
                  <span className="truncate text-sm text-gray-700">{note.title}</span>
                </div>
                <Text className="!shrink-0 !text-xs !text-gray-400">
                  {(note.publishedAt ?? note.createdAt).slice(0, 10)}
                </Text>
              </Link>
            ))}
            {notes.length === 0 && (
              <Paragraph type="secondary" className="!m-0 !p-5">{t('notes.empty')}</Paragraph>
            )}
          </div>
        </section>

        {/* 快捷操作 */}
        <section>
          <Title level={4} className="!mb-4">{t('desk.quick')}</Title>
          <div className="space-y-3">
            <Link to="/write/new" className="block no-underline">
              <div className="group rounded-xl border border-[color:var(--border)] bg-white p-5 transition-shadow hover:shadow-sm">
                <Title level={5} className="!mb-1 !text-gray-800">{t('desk.quick.new')}</Title>
                <Paragraph type="secondary" className="!mb-0 !text-sm">{t('desk.quick.newDesc')}</Paragraph>
              </div>
            </Link>
            <Link to="/write/drafts" className="block no-underline">
              <div className="group rounded-xl border border-[color:var(--border)] bg-white p-5 transition-shadow hover:shadow-sm">
                <Title level={5} className="!mb-1 !text-gray-800">{t('desk.quick.drafts')}</Title>
                <Paragraph type="secondary" className="!mb-0 !text-sm">{t('desk.quick.draftsDesc')}</Paragraph>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
