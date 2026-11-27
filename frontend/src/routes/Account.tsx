/**
 * 账户设置（登录用户可用）：修改自己的密码。
 * 之前改密入口藏在 /write/settings（仅管理员可见），普通用户找不到——这里提供公开入口。
 * 复用后端 Better Auth 的 /api/auth/change-password 端点。
 */
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import { signOutAndClear, useSession } from '@/lib/auth-client';
import { useMyPermissions } from '@/lib/permissions';
import { Button, Card, Descriptions, Form, Input, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

type Values = { currentPassword: string; newPassword: string; confirmPassword: string };

export function Account() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: perms } = useMyPermissions();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: Values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error(t('settings.mismatch'));
      return;
    }
    setLoading(true);
    try {
      // Better Auth 原生端点：/api/auth/change-password（经同源代理到后端）
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success(t('settings.success'));
      await signOutAndClear();
      navigate('/login', { replace: true });
    } catch {
      // api 客户端已统一处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10">
      <Title level={2} className="!mb-6">{t('settings.title')}</Title>

      <Card className="!mb-6">
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('login.email')}>{session?.user.email}</Descriptions.Item>
          <Descriptions.Item label={t('account.role')}>
            <Tag color={perms?.role === 'admin' ? 'blue' : 'default'}>{perms?.role ?? 'guest'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('account.permissions')}>
            <Text type="secondary">{(perms?.permissions ?? []).length}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Title level={4}>{t('settings.password')}</Title>
        <Paragraph type="secondary">{t('account.passwordDesc')}</Paragraph>
        <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
          <Form.Item label={t('settings.current')} name="currentPassword" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label={t('settings.new')}
            name="newPassword"
            rules={[{ required: true, min: 8, message: t('settings.minLen') }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label={t('settings.confirm')}
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_rule, value: string) =>
                  !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('settings.mismatch'))),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('settings.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
