/**
 * 公开笔记列表页（vanBlog 风格）：标签筛选 + 卡片网格 + 搜索 + 分页。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import { Button, Input, Pagination, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function Notes() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const { data, isLoading, isError } = useNotes({ page: 1, pageSize: 100, tag });

  const items = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (data?.items ?? []).filter((note) =>
      !q || note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q));
  }, [data, keyword]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (data?.items ?? []).forEach((n) => n.tags.forEach((x) => set.add(x)));
    return Array.from(set).slice(0, 12);
  }, [data]);

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <div className="mx-auto max-w-[1080px] px-6 py-12">
        <Title level={1} className="!mb-2 !text-3xl">{t('home.section.notes')}</Title>
        <Paragraph type="secondary">{t('home.section.notes.desc')}</Paragraph>

        {/* 搜索 + 标签筛选 */}
        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[color:var(--border)] pb-5">
          <Input.Search
            allowClear
            placeholder={t('desk.search')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="!w-full sm:!w-64"
          />
          <div className="flex flex-wrap gap-2">
            {tag && (
              <Button size="small" type="primary" onClick={() => setTag(undefined)}>{tag} ×</Button>
            )}
            {allTags.filter((x) => x !== tag).map((x) => (
              <Tag key={x} className="cursor-pointer !py-1" onClick={() => setTag(x)}>{x}</Tag>
            ))}
          </div>
        </div>

        {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
        {isError && <Paragraph type="danger">{t('notes.notFound')}</Paragraph>}
        {!isLoading && items.length === 0 && <Paragraph type="secondary">{t('notes.empty')}</Paragraph>}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice((page - 1) * 12, page * 12).map((note, i) => (
            <Link key={note.id} to={`/notes/${note.slug}`}
              className="group flex flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 no-underline transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 text-3xl dark:from-slate-800 dark:to-slate-700">
                {['✦', '◈', '❋', '✧', '◐', '✎'][i % 6]}
              </div>
              <Title level={4} className="!mb-2 !text-base !leading-snug !text-[color:var(--text)] group-hover:!text-[color:var(--brand)]">
                {note.title}
              </Title>
              <Paragraph className="!mb-3 !line-clamp-2 !flex-1 !text-sm !text-[color:var(--text-secondary)]">
                {note.summary || note.content.replace(/[#*`>\[\]]/g, '').slice(0, 100)}
              </Paragraph>
              <div className="flex flex-wrap items-center gap-2">
                {note.tags.slice(0, 2).map((x) => <Tag key={x} className="!text-xs">{x}</Tag>)}
                <Text className="!text-xs !text-[color:var(--text-muted)]">
                  {(note.publishedAt ?? note.createdAt).slice(0, 10)}
                </Text>
              </div>
            </Link>
          ))}
        </div>

        {data && data.total > 12 && (
          <Pagination className="mt-8 text-center" current={page} pageSize={12} total={data.total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
