/**
 * 文章/草稿管理：vanBlog 风格的表格 —— 搜索、状态筛选、批量删除、分页。
 * 由 route 参数决定显示"文章管理"（全部/已发布）还是"草稿箱"（仅草稿）。
 */
import { useI18n } from '@/i18n';
import { useAdminNotes, useDeleteNote } from '@/api/notes';
import { Button, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '@/api/contract';

const { Title } = Typography;

export function AdminNotes({ mode = 'all' }: { mode?: 'all' | 'drafts' }) {
  const { t } = useI18n();
  const { data, isLoading } = useAdminNotes({ pageSize: 100 });
  const del = useDeleteNote();
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<React.Key[]>([]);

  const notes = data?.items ?? [];
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return notes.filter((note) => {
      if (mode === 'drafts' && note.status !== 'draft') return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [notes, mode, keyword]);

  const columns: ColumnsType<Note> = [
    { title: t('admin.titleField'), dataIndex: 'title', key: 'title', sorter: (a, b) => a.title.localeCompare(b.title) },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'published' ? 'green' : 'default'}>
          {s === 'published' ? t('admin.status.published') : t('admin.status.draft')}
        </Tag>
      ),
    },
    {
      title: t('notes.tags'),
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags.slice(0, 3).map((x) => <Tag key={x}>{x}</Tag>),
    },
    {
      title: t('notes.date'),
      dataIndex: 'publishedAt',
      key: 'date',
      width: 120,
      render: (v: string | null, note) => (v ?? note.createdAt).slice(0, 10),
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_, note) => (
        <Space size={0}>
          <Link to={`/write/${note.id}`}>
            <Button type="link" size="small" className="!px-1">{t('admin.edit')}</Button>
          </Link>
          <Popconfirm
            title={t('admin.deleteConfirm')}
            onConfirm={() => del.mutate(note.id, { onSuccess: () => message.success(t('admin.saved')) })}
          >
            <Button type="link" size="small" danger className="!px-1">{t('admin.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Title level={2} className="!mb-0">
          {mode === 'drafts' ? t('desk.nav.drafts') : t('desk.nav.articles')}
        </Title>
        <Space>
          <Input.Search
            allowClear
            placeholder={t('desk.search')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="!w-56"
          />
          {selected.length > 0 && (
            <Popconfirm
              title={`${t('admin.deleteConfirm')} (${selected.length})`}
              onConfirm={() => {
                Promise.all(selected.map((id) => del.mutateAsync(id as string))).then(() => {
                  message.success(t('admin.saved'));
                  setSelected([]);
                });
              }}
            >
              <Button danger size="small">{t('admin.delete')} ({selected.length})</Button>
            </Popconfirm>
          )}
          <Link to="/write/new">
            <Button type="primary">{t('admin.new')}</Button>
          </Link>
        </Space>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        />
      </div>
    </div>
  );
}
