/**
 * 公开笔记列表页：搜索、标签筛选、分页全部由后端接口完成。
 */
import { useI18n } from '@/i18n';
import { useNotes, useTags } from '@/api/notes';
import { Highlight } from '@/components/Highlight';
import { Button, Input, Pagination, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function Notes() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [tag, setTag] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isLoading, isError } = useNotes({
    page,
    pageSize,
    ...(tag ? { tag } : {}),
    ...(debounced ? { keyword: debounced } : {}),
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });
  const { data: tags } = useTags();

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
              <Button size="small" type="primary" onClick={() => { setTag(undefined); setPage(1); }}>{tag} ×</Button>
            )}
            {tags?.filter((x) => x.name !== tag).slice(0, 12).map((x) => (
              <Tag key={x.name} className="cursor-pointer !py-1" onClick={() => { setTag(x.name); setPage(1); }}>
                {x.name} {x.count}
              </Tag>
            ))}
          </div>
        </div>

        {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
        {isError && <Paragraph type="danger">{t('notes.notFound')}</Paragraph>}
        {!isLoading && data && data.items.length === 0 && (
          <Paragraph type="secondary">{t('notes.empty')}</Paragraph>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((note, i) => (
            <Link key={note.id} to={`/notes/${note.slug}`}
              className="group flex flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 no-underline transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 text-3xl dark:from-slate-800 dark:to-slate-700">
                {['✦', '◈', '❋', '✧', '◐', '✎'][i % 6]}
              </div>
              <Title level={4} className="!mb-2 !text-base !leading-snug !text-[color:var(--text)] group-hover:!text-[color:var(--brand)]">
                <Highlight text={note.title} keyword={debounced} />
              </Title>
              <Paragraph className="!mb-3 !line-clamp-2 !flex-1 !text-sm !text-[color:var(--text-secondary)]">
                <Highlight text={note.summary || note.content.replace(/[#*`>\[\]]/g, '').slice(0, 100)} keyword={debounced} />
              </Paragraph>
              <div className="flex flex-wrap items-center gap-2">
                {note.tags.slice(0, 2).map((x) => <Tag key={x} className="!text-xs">{x}</Tag>)}
                <Text className="!text-xs !text-[color:var(--text-muted)]">
                  {(note.publishedAt ?? note.createdAt).slice(0, 10)} · {note.viewCount} {t('notes.views')}
                </Text>
              </div>
            </Link>
          ))}
        </div>

        {data && data.total > pageSize && (
          <Pagination
            className="mt-8 text-center"
            current={page}
            pageSize={pageSize}
            total={data.total}
            onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}
      </div>
    </div>
  );
}
