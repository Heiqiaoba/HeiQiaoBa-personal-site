/**
 * 权限管理：所有权限点的增删改查。
 * 内置权限（system=true）不可改 code、不可删除；其余按 permission:manage 权限操作。
 */
import { useI18n } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import {
  useCreatePermission, useDeletePermission, usePermissionsList, useUpdatePermission, type PermissionRow,
} from '@/api/rbac';
import { Button, Form, Input, Modal, Popconfirm, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

type FormValues = { code: string; name: string; description: string; group: string };

export function Permissions() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data, isLoading } = usePermissionsList();
  const create = useCreatePermission();
  const update = useUpdatePermission();
  const remove = useDeletePermission();
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const canManage = has('permission:manage');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ group: 'general' });
    setOpen(true);
  };
  const openEdit = (p: PermissionRow) => {
    setEditing(p);
    form.setFieldsValue({ code: p.code, name: p.name, description: p.description, group: p.group });
    setOpen(true);
  };
  const onOk = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...values });
        message.success(t('perms.updated'));
      } else {
        await create.mutateAsync(values);
        message.success(t('perms.created'));
      }
      setOpen(false);
    } catch {
      // api 客户端已统一处理
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Title level={2} className="!mb-2">{t('perms.title')}</Title>
          <Paragraph type="secondary" className="!mb-0">{t('perms.subtitle')}</Paragraph>
        </div>
        {canManage && <Button type="primary" onClick={openCreate}>{t('perms.new')}</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
        <Table
          rowKey="id" size="small" loading={isLoading} pagination={false}
          dataSource={data ?? []} locale={{ emptyText: t('perms.empty') }}
          columns={[
            { title: t('perms.code'), dataIndex: 'code', key: 'code', render: (v: string) => <code className="text-xs">{v}</code> },
            { title: t('perms.name'), dataIndex: 'name', key: 'name' },
            { title: t('perms.group'), dataIndex: 'group', key: 'group', width: 100, render: (v: string) => <Tag>{v}</Tag> },
            { title: t('perms.description'), dataIndex: 'description', key: 'description', render: (v: string) => <Text type="secondary">{v || '—'}</Text> },
            {
              title: '', key: 'actions', width: 120,
              render: (_: unknown, p: PermissionRow) =>
                canManage ? (
                  <span className="flex gap-1">
                    <Button size="small" type="link" onClick={() => openEdit(p)}>{t('perms.editBtn')}</Button>
                    {!p.system && (
                      <Popconfirm title={t('perms.deleteConfirm')} onConfirm={() => remove.mutate(p.id)}>
                        <Button size="small" type="link" danger>{t('perms.deleteBtn')}</Button>
                      </Popconfirm>
                    )}
                  </span>
                ) : null,
            },
          ]}
        />
      </div>

      <Modal
        open={open} title={editing ? t('perms.editBtn') : t('perms.new')}
        onOk={onOk} onCancel={() => setOpen(false)}
        okText={t('admin.save')} cancelText={t('admin.cancel')} width={520}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label={t('perms.code')} name="code"
            rules={[{ required: true, pattern: /^[a-z0-9:_-]+$/, message: t('perms.codeRule') }]}>
            <Input disabled={!!editing?.system} />
          </Form.Item>
          <Form.Item label={t('perms.name')} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('perms.group')} name="group" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('perms.description')} name="description">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
