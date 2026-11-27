/**
 * 操作审计日志：查看管理员的敏感操作记录（谁、何时、做了什么）。
 */
import { useI18n } from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Table, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

type AuditRow = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  target: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export function AuditLogs() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<AuditRow[]>('/admin/audit-logs'),
  });

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <Title level={2} className="!mb-2">{t('audit.title')}</Title>
      <Paragraph type="secondary">{t('audit.subtitle')}</Paragraph>
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
        <Table
          rowKey="id" size="small" loading={isLoading} pagination={{ pageSize: 20 }}
          dataSource={data ?? []} locale={{ emptyText: t('audit.empty') }}
          columns={[
            { title: t('audit.time'), dataIndex: 'createdAt', key: 'createdAt', width: 180,
              render: (v: string) => <Text className="!text-xs">{new Date(v).toLocaleString()}</Text> },
            { title: t('audit.actor'), dataIndex: 'actorEmail', key: 'actorEmail', width: 200,
              render: (v: string | null) => v ?? <Text type="secondary">—</Text> },
            { title: t('audit.action'), dataIndex: 'action', key: 'action', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: t('audit.target'), dataIndex: 'target', key: 'target', render: (v: string) => <code className="text-xs">{v}</code> },
          ]}
        />
      </div>
    </div>
  );
}
