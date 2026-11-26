/**
 * 文章 / 草稿管理：所有筛选、搜索、排序、分页都在后端接口完成。
 * - 文章管理：status 全部（不传）
 * - 草稿箱：status=draft
 * 前端只负责展示与把用户操作转成查询参数（防抖搜索）。
 */
import { useI18n } from '@/i18n';
import { useAdminNotes, useDeleteNote } from '@/api/notes';
import type { NoteListQuery } from '@/api/contract';
import { Button, Input, Popconfirm, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '@/api/contract';

const { Title } = Typography;

type SortBy = NonNullable<NoteListQuery['sortBy']>;

export function AdminNotes({ mode = 'all' }: { mode?: 'all' | 'drafts' }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<React.Key[]>([]);
  const del = useDeleteNote();

  // 搜索防抖：300ms 后才打到接口
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const query: Partial<NoteListQuery> = {
    page,
    pageSize,
    ...(mode === 'drafts' ? { status: 'draft' } : {}),
    ...(debounced ? { keyword: debounced } : {}),
    sortBy,
    sortOrder,
  };
  const { data, isLoading } = useAdminNotes(query);

  /** 点击表头排序：在服务端排序，不在前端本地排 */
  const onTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: { order?: 'ascend' | 'descend' | null; field?: React.Key } | unknown,
  ) => {
    const s = sorter as { order?: 'ascend' | 'descend' | null; field?: React.Key };
    if (s?.order && typeof s.field === 'string') {
      setSortBy(s.field as SortBy);
      setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
      setPage(1);
    } else {
      setSortBy('updatedAt');
      setSortOrder('desc');
    }
  };

  const columns: ColumnsType<Note> = [
    {
      title: t('admin.titleField'), dataIndex: 'title', key: 'title', sorter: true,
      width: '35%',
    },
    {
      title: t('admin.status'), dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => (
        <Tag color={s === 'published' ? 'green' : 'default'}>
          {s === 'published' ? t('admin.status.published') : t('admin.status.draft')}
        </Tag>
      ),
    },
    {
      title: t('notes.tags'), dataIndex: 'tags', key: 'tags',
      render: (tags: string[]) => tags.slice(0, 3).map((x) => <Tag key={x}>{x}</Tag>),
    },
    {
      title: t('notes.date'), dataIndex: 'publishedAt', key: 'publishedAt', sorter: true, width: 120,
      render: (v: string | null, note) => (v ?? note.createdAt).slice(0, 10),
    },
    {
      title: t('notes.updated'), dataIndex: 'updatedAt', key: 'updatedAt', sorter: true, width: 120,
      render: (v: string) => v.slice(0, 10),
    },
    {
      title: '', key: 'actions', width: 130,
      render: (_, note) => (
        <span className="flex gap-1">
          <Link to={`/write/${note.id}`}>
            <Button type="link" size="small" className="!px-1">{t('admin.edit')}</Button>
          </Link>
          <Popconfirm
            title={t('admin.deleteConfirm')}
            onConfirm={() => del.mutate(note.id, { onSuccess: () => message.success(t('admin.saved')) })}
          >
            <Button type="link" size="small" danger className="!px-1">{t('admin.delete')}</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div className="px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Title level={2} className="!mb-0">
          {mode === 'drafts' ? t('desk.nav.drafts') : t('desk.nav.articles')}
          <span className="ml-2 text-base font-normal text-gray-400">({data?.total ?? 0})</span>
        </Title>
        <span className="flex items-center gap-3">
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
          <Link to="/write/new"><Button type="primary">{t('admin.new')}</Button></Link>
        </span>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          size="middle"
          onChange={onTableChange}
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [5, 10, 20, 50],
            showTotal: (total) => `${total} ${t('desk.stats').split(' · ')[0]}`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </div>
    </div>
  );
}
