/**
 * 用户管理：查看用户、分配角色、封禁/解封。
 * 按钮级权限：user:role / user:ban 分别控制「分配角色」「封禁」按钮。
 */
import { useI18n } from '@/i18n';
import { usePermissions } from '@/lib/permissions';
import { useBanUser, useSetUserRole, useUsers, type UserRow } from '@/api/rbac';
import { useRoles } from '@/api/rbac';
import { Button, Popconfirm, Select, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';

const { Title, Paragraph } = Typography;

export function Users() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const setRole = useSetUserRole();
  const ban = useBanUser();
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const roleOptions = (roles ?? []).map((r) => ({ value: r.code, label: `${r.name} (${r.code})` }));

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <Title level={2} className="!mb-2">{t('users.title')}</Title>
      <Paragraph type="secondary">{t('users.subtitle')}</Paragraph>
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          pagination={false}
          dataSource={users ?? []}
          locale={{ emptyText: t('users.empty') }}
          columns={[
            {
              title: t('users.email'), dataIndex: 'email', key: 'email',
              render: (v: string, row: UserRow) => (
                <span>
                  {v} {row.banned && <Tag color="red">{t('users.banned')}</Tag>}
                </span>
              ),
            },
            { title: t('users.name'), dataIndex: 'name', key: 'name', width: 140 },
            {
              title: t('users.role'), dataIndex: 'role', key: 'role', width: 180,
              render: (v: string, row: UserRow) =>
                has('user:role') ? (
                  <Select
                    size="small"
                    className="!w-36"
                    value={roleDraft[row.id] ?? v}
                    options={roleOptions}
                    onChange={(next) => {
                      setRoleDraft((d) => ({ ...d, [row.id]: next }));
                      setRole.mutate(
                        { id: row.id, role: next },
                        { onSuccess: () => message.success(t('users.roleUpdated')) },
                      );
                    }}
                  />
                ) : (
                  <Tag color={v === 'admin' ? 'blue' : 'default'}>{v}</Tag>
                ),
            },
            {
              title: t('users.created'), dataIndex: 'createdAt', key: 'createdAt', width: 120,
              render: (v: string) => v.slice(0, 10),
            },
            {
              title: '', key: 'actions', width: 100,
              render: (_: unknown, row: UserRow) =>
                has('user:ban') ? (
                  row.banned ? (
                    <Button size="small" type="link" onClick={() => ban.mutate({ id: row.id, banned: false })}>
                      {t('users.unban')}
                    </Button>
                  ) : (
                    <Popconfirm
                      title={t('users.banConfirm')}
                      onConfirm={() => ban.mutate({ id: row.id, banned: true })}
                    >
                      <Button size="small" type="link" danger>{t('users.ban')}</Button>
                    </Popconfirm>
                  )
                ) : null,
            },
          ]}
        />
      </div>
    </div>
  );
}
