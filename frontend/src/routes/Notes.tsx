/**
 * 公开笔记列表页：展示已发布笔记，支持按标签筛选与分页。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import { Button, Pagination, Tag, Typography } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function Notes() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState<string | undefined>();
  const { data, isLoading, isError } = useNotes({ page, tag });

  return (
    <div className="mx-auto max-w-[720px] px-6 py-14">
      <Title level={2}>{t('home.section.notes')}</Title>
      {tag && (
        <Button type="link" className="!px-0" onClick={() => setTag(undefined)}>
          {t('notes.tags')}: {tag} ×
        </Button>
      )}
      {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
      {isError && <Paragraph type="danger">{t('notes.notFound')}</Paragraph>}
      {data && data.items.length === 0 && (
        <Paragraph type="secondary">{t('notes.empty')}</Paragraph>
      )}
      <ul className="m-0 list-none space-y-6 p-0">
        {data?.items.map((note) => (
          <li key={note.id} className="border-b border-black/5 pb-6">
            <Link to={`/notes/${note.slug}`} className="no-underline">
              <Title level={4} className="!mb-1 !text-black/85 hover:!text-black">
                {note.title}
              </Title>
            </Link>
            <Paragraph className="!mb-2 !text-sm !leading-relaxed !text-black/60">
              {note.summary || note.content.slice(0, 120)}
            </Paragraph>
            <div className="flex flex-wrap items-center gap-2">
              {note.tags.map((t) => (
                <Tag key={t} className="cursor-pointer" onClick={() => setTag(t)}>
                  {t}
                </Tag>
              ))}
              {note.publishedAt && (
                <Text type="secondary" className="!text-xs">
                  {new Date(note.publishedAt).toLocaleDateString()}
                </Text>
              )}
              <Link to={`/notes/${note.slug}`} className="!text-sm">
                {t('notes.readMore')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {data && data.total > data.pageSize && (
        <Pagination
          className="mt-8"
          current={page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
