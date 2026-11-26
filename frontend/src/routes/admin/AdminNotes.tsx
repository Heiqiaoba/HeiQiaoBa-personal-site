/**
 * 写作台首页：概览统计 + 状态筛选 + 搜索 + 卡片式笔记列表。
 * 从"数据表格"改为"作品墙"视角，仅管理员可见（页面由 AdminGuard 保护）。
 */
import { useI18n } from '@/i18n';
import { useAdminNotes, useDeleteNote } from '@/api/notes';
import { Button, Input, Popconfirm, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '@/api/contract';

const { Title, Paragraph, Text } = Typography;

type StatusFilter = 'all' | 'published' | 'draft';

export function AdminNotes() {
  const { t } = useI18n();
  const { data, isLoading } = useAdminNotes({ pageSize: 100 });
  const del = useDeleteNote();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [keyword, setKeyword] = useState('');

  const notes = data?.items ?? [];
  const published = notes.filter((n) => n.status === 'published').length;
  const drafts = notes.length - published;
  const tagCount = new Set(notes.flatMap((n) => n.tags)).size;

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return notes.filter((note) => {
      if (status !== 'all' && note.status !== status) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.summary.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    });
  }, [notes, status, keyword]);

  const tabs: { key: StatusFilter; label: () => string; count: number }[] = [
    { key: 'all', label: () => t('desk.all'), count: notes.length },
    { key: 'published', label: () => t('admin.status.published'), count: published },
    { key: 'draft', label: () => t('admin.status.draft'), count: drafts },
  ];

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12">
      {/* 标题 + 主操作 */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Title level={2} className="!mb-1">{t('nav.write')}</Title>
          <Paragraph type="secondary" className="!mb-0 !text-sm">
            {notes.length} {t('desk.stats').split(' · ')[0]} · {published} {t('desk.stats').split(' · ')[1]} ·{' '}
            {drafts} {t('desk.stats').split(' · ')[2]} · {tagCount} {t('desk.stats').split(' · ')[3]}
          </Paragraph>
        </div>
        <Link to="/write/new">
          <Button type="primary">{t('admin.new')}</Button>
        </Link>
      </div>

      {/* 筛选 + 搜索 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-4">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              type={status === tab.key ? 'primary' : 'text'}
              size="small"
              onClick={() => setStatus(tab.key)}
            >
              {tab.label()} {tab.count}
            </Button>
          ))}
        </div>
        <Input.Search
          allowClear
          placeholder={t('desk.search')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="!w-auto sm:!w-64"
        />
      </div>

      {/* 卡片列表 */}
      {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
      {!isLoading && filtered.length === 0 && (
        <Paragraph type="secondary">{t('desk.empty')}</Paragraph>
      )}
      <div className="space-y-4">
        {filtered.map((note) => (
          <NoteCard key={note.id} note={note} onDelete={() => del.mutate(note.id, {
            onSuccess: () => message.success(t('admin.saved')),
          })} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <div className={`rounded-xl border p-5 transition-shadow hover:shadow-sm ${
      note.status === 'draft' ? 'border-dashed border-black/15 bg-black/[0.015]' : 'border-black/10 bg-white'
    }`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <Link to={`/write/${note.id}`} className="no-underline">
          <Title level={4} className="!mb-0 !text-black/85 hover:!text-black">{note.title}</Title>
        </Link>
        <Tag color={note.status === 'published' ? 'green' : 'default'} className="!mt-1 !shrink-0">
          {note.status === 'published' ? t('admin.status.published') : t('admin.status.draft')}
        </Tag>
      </div>
      <Paragraph className="!mb-3 !text-sm !leading-relaxed !text-black/55">
        {note.summary || note.content.replace(/[#*`>\[\]]/g, '').slice(0, 140) || '—'}
      </Paragraph>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {note.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
          <Text type="secondary" className="!text-xs">
            {(note.publishedAt ?? note.createdAt).slice(0, 10)}
          </Text>
        </div>
        <div className="flex gap-2">
          <Link to={`/write/${note.id}`}>
            <Button size="small" type="link" className="!px-0">{t('admin.edit')}</Button>
          </Link>
          <Popconfirm title={t('admin.deleteConfirm')} onConfirm={onDelete}>
            <Button size="small" type="link" danger className="!px-0">{t('admin.delete')}</Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}
