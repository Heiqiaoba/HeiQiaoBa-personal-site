/**
 * 我的收藏（稍后读）：从本地收藏的 slug 加载笔记详情并展示。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import { favorites } from '@/lib/favorites';
import { Button, Empty, Tag, Typography } from 'antd';
import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

export function Favorites() {
  const { t } = useI18n();
  const slugs = useSyncExternalStore(favorites.subscribe, favorites.getSnapshot, favorites.getSnapshot);
  // 拉取全部已发布笔记再按收藏 slug 过滤（个人站量小，足够）
  const { data, isLoading } = useNotes({ page: 1, pageSize: 100 });
  const items = (data?.items ?? []).filter((n) => slugs.includes(n.slug));

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-12">
      <Title level={1} className="!mb-2 !text-3xl">{t('fav.title')}</Title>
      <Paragraph type="secondary">{t('fav.subtitle')}</Paragraph>
      {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
      {!isLoading && items.length === 0 && (
        <Empty description={t('fav.empty')} />
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((note) => (
          <div key={note.id} className="flex flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
            <Link to={`/notes/${note.slug}`} className="no-underline">
              <Title level={4} className="!mb-2 !text-base !leading-snug !text-[color:var(--text)]">{note.title}</Title>
              <Paragraph className="!mb-3 !line-clamp-2 !text-sm !text-[color:var(--text-secondary)]">
                {note.summary || note.content.replace(/[#*`>\[\]]/g, '').slice(0, 100)}
              </Paragraph>
            </Link>
            <div className="mt-auto flex items-center justify-between">
              <Text className="!text-xs !text-[color:var(--text-muted)]">
                {(note.publishedAt ?? note.createdAt).slice(0, 10)}
              </Text>
              <Button size="small" type="link" danger onClick={() => favorites.toggle(note.slug)}>
                {t('fav.remove')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
