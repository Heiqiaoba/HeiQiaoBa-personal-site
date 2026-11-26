/**
 * 归档页：按 年-月 分组展示所有已发布文章（服务端分页拉取全部）。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import type { Note } from '@/api/contract';
import { Typography } from 'antd';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function Archives() {
  const { t } = useI18n();
  const { data, isLoading } = useNotes({ page: 1, pageSize: 100, sortBy: 'publishedAt', sortOrder: 'desc' });

  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const note of data?.items ?? []) {
      const d = new Date(note.publishedAt ?? note.createdAt);
      const key = `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')}`;
      const list = map.get(key) ?? [];
      list.push(note);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-14">
      <Title level={1} className="!text-[2.2rem]">{t('archive.title')}</Title>
      <Paragraph type="secondary">{t('archive.intro')}</Paragraph>
      {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
      <div className="mt-8 space-y-10">
        {groups.map(([month, notes]) => (
          <section key={month}>
            <Title level={3} className="!mb-4 !text-lg !text-[color:var(--text)]">{month}</Title>
            <ul className="m-0 list-none space-y-3 p-0">
              {notes.map((note) => (
                <li key={note.id} className="flex items-baseline justify-between gap-4 border-b border-[color:var(--border)] pb-2">
                  <Link to={`/notes/${note.slug}`} className="text-[color:var(--text)] no-underline hover:text-[color:var(--brand)]">
                    {note.title}
                  </Link>
                  <Text className="!shrink-0 !text-xs !text-[color:var(--text-muted)]">
                    {(note.publishedAt ?? note.createdAt).slice(0, 10)}
                  </Text>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
