/**
 * 管理端笔记列表：展示全部笔记（含草稿），提供新建/编辑/删除入口。
 */
import { useI18n } from '@/i18n';
import { useAdminNotes, useDeleteNote } from '@/api/notes';
import { Button, Popconfirm, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Note } from '@/api/contract';
import { Link } from 'react-router-dom';

const { Title } = Typography;

export function AdminNotes() {
  const { t } = useI18n();
  const { data, isLoading } = useAdminNotes();
  const del = useDeleteNote();

  const columns: ColumnsType<Note> = [
    { title: t('admin.titleField'), dataIndex: 'title', key: 'title' },
    { title: t('admin.slug'), dataIndex: 'slug', key: 'slug' },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'published' ? 'green' : 'default'}>{s}</Tag>,
    },
    {
      title: t('notes.tags'),
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags.map((x) => <Tag key={x}>{x}</Tag>),
    },
    {
      title: '',
      key: 'actions',
      render: (_, note) => (
        <div className="flex gap-2">
          <Link to={`/write/${note.id}`}><Button size="small">{t('admin.edit')}</Button></Link>
          <Popconfirm
            title={t('admin.deleteConfirm')}
            onConfirm={() => del.mutate(note.id, { onSuccess: () => message.success(t('admin.saved')) })}
          >
            <Button size="small" danger>{t('admin.delete')}</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Title level={2} className="!mb-0">{t('admin.notes')}</Title>
        <Link to="/write/new">
          <Button type="primary">{t('admin.new')}</Button>
        </Link>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={false}
      />
    </div>
  );
}
