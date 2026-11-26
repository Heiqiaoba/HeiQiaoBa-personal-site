/**
 * 账户设置：修改作者密码（Better Auth /api/auth/change-password）。
 * 改完后会话可能失效，提示用户重新登录。
 */
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import { signOutAndClear } from '@/lib/auth-client';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

type Values = { currentPassword: string; newPassword: string; confirmPassword: string };

export function Settings() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: Values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error(t('settings.mismatch'));
      return;
    }
    setLoading(true);
    try {
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
    <div className="mx-auto max-w-[640px] px-6 py-10">
      <Title level={2} className="!mb-6">{t('settings.title')}</Title>
      <Card>
        <Title level={4}>{t('settings.password')}</Title>
        <Paragraph type="secondary">{t('settings.password')}</Paragraph>
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
