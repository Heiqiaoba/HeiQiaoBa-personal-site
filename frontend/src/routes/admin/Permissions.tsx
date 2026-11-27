/**
 * 权限管理（只读）：展示所有权限点，按资源分组。
 * 权限码由后端代码定义，不支持在线新增——新增功能时在后端 ALL_PERMISSIONS 登记即可。
 */
import { useI18n } from '@/i18n';
import { usePermissionsList } from '@/api/rbac';
import { Table, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

export function Permissions() {
  const { t } = useI18n();
  const { data, isLoading } = usePermissionsList();

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <Title level={2} className="!mb-2">{t('perms.title')}</Title>
      <Paragraph type="secondary">{t('perms.subtitle')}</Paragraph>
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
        <Table
          rowKey="id" size="small" loading={isLoading} pagination={false}
          dataSource={data ?? []} locale={{ emptyText: t('perms.empty') }}
          columns={[
            { title: t('perms.code'), dataIndex: 'code', key: 'code', render: (v: string) => <code className="text-xs">{v}</code> },
            { title: t('perms.name'), dataIndex: 'name', key: 'name' },
            { title: t('perms.group'), dataIndex: 'group', key: 'group', width: 100, render: (v: string) => <Tag>{v}</Tag> },
            { title: t('perms.description'), dataIndex: 'description', key: 'description', render: (v: string) => <Text type="secondary">{v || '—'}</Text> },
          ]}
        />
      </div>
    </div>
  );
}
