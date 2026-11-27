/**
 * 角色管理：新建/编辑/删除角色，并勾选角色拥有的权限（按钮级）。
 * 内置角色（guest/admin）不可改删；所有操作受 role:manage 权限控制。
 */
import { useI18n } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import {
  useCreateRole, useDeleteRole, usePermissionsList, useRoles, useUpdateRole, type RoleRow,
} from '@/api/rbac';
import {
  Button, Checkbox, Form, Input, Modal, Popconfirm, Table, Tag, Typography, message,
} from 'antd';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

type FormValues = { code: string; name: string; description: string };

export function Roles() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data: roles, isLoading } = useRoles();
  const { data: permissions } = usePermissionsList();
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();

  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [form] = Form.useForm<FormValues>();

  const canManage = has('role:manage');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setChecked([]);
    setModalOpen(true);
  };
  const openEdit = (role: RoleRow) => {
    setEditing(role);
    form.setFieldsValue({ code: role.code, name: role.name, description: role.description });
    setChecked(role.permissionIds);
    setModalOpen(true);
  };
  const onOk = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: values.name, description: values.description, permissionIds: checked });
        message.success(t('roles.updated'));
      } else {
        await create.mutateAsync({ ...values, permissionIds: checked });
        message.success(t('roles.created'));
      }
      setModalOpen(false);
    } catch {
      // api 客户端已统一处理
    }
  };

  // 按 group 分组展示权限复选框
  const grouped = (permissions ?? []).reduce<Record<string, NonNullable<typeof permissions>[number][]>>((acc, p) => {
    if (!p) return acc;
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  /** 分组全选/取消 */
  const toggleGroup = (ids: string[], selectAll: boolean) => {
    setChecked((prev) =>
      selectAll
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((id) => !ids.includes(id)),
    );
  };
  /** 分组反选 */
  const invertGroup = (ids: string[]) => {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) (next.has(id) ? next.delete(id) : next.add(id));
      return Array.from(next);
    });
  };

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Title level={2} className="!mb-2">{t('roles.title')}</Title>
          <Paragraph type="secondary" className="!mb-0">{t('roles.subtitle')}</Paragraph>
        </div>
        {canManage && <Button type="primary" onClick={openCreate}>{t('roles.new')}</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
        <Table
          rowKey="id" size="small" loading={isLoading} pagination={false}
          dataSource={roles ?? []} locale={{ emptyText: t('roles.empty') }}
          columns={[
            { title: t('roles.name'), dataIndex: 'name', key: 'name', render: (v: string, r: RoleRow) => (
              <span>{v} {r.system && <Tag>{t('roles.builtin')}</Tag>}</span>
            ) },
            { title: t('roles.code'), dataIndex: 'code', key: 'code', render: (v: string) => <code className="text-xs">{v}</code> },
            { title: t('roles.description'), dataIndex: 'description', key: 'description' },
            { title: t('roles.permCount'), key: 'count', width: 100, render: (_: unknown, r: RoleRow) => r.permissionIds.length },
            {
              title: '', key: 'actions', width: 160,
              render: (_: unknown, r: RoleRow) =>
                canManage && !r.system ? (
                  <span className="flex gap-1">
                    <Button size="small" type="link" onClick={() => openEdit(r)}>{t('roles.editBtn')}</Button>
                    <Popconfirm title={t('roles.deleteConfirm')} onConfirm={() => remove.mutate(r.id)}>
                      <Button size="small" type="link" danger>{t('admin.delete')}</Button>
                    </Popconfirm>
                  </span>
                ) : null,
            },
          ]}
        />
      </div>

      <Modal
        open={modalOpen}
        title={editing ? t('roles.edit') : t('roles.new')}
        onOk={onOk}
        onCancel={() => setModalOpen(false)}
        okText={t('admin.save')}
        cancelText={t('admin.cancel')}
        width={560}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label={t('roles.code')} name="code"
            rules={[{ required: true, pattern: /^[a-z0-9_-]+$/, message: t('roles.codeRule') }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item label={t('roles.name')} name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('roles.description')} name="description">
            <Input />
          </Form.Item>
        </Form>
        <Text type="secondary">{t('roles.permSelect')}</Text>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-100 p-3">
          {Object.entries(grouped).map(([group, list]) => {
            const ids = list.map((p) => p.id);
            const allChecked = ids.length > 0 && ids.every((id) => checked.includes(id));
            return (
              <div key={group} className="mb-3 border-b border-gray-50 pb-2 last:border-0">
                <div className="mb-1 flex items-center gap-2">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={!allChecked && ids.some((id) => checked.includes(id))}
                    onChange={(e) => toggleGroup(ids, e.target.checked)}
                  >
                    <Text strong className="!text-xs">{group}</Text>
                  </Checkbox>
                  <Button size="small" type="link" className="!px-1 !text-xs" onClick={() => invertGroup(ids)}>
                    {t('roles.invert')}
                  </Button>
                </div>
                <Checkbox.Group
                  className="ml-6"
                  value={checked}
                  onChange={setChecked}
                  options={list.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
                />
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
