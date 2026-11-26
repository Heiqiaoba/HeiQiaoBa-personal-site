/**
 * 登录/注册页（公开路由）。
 * 使用 lib/auth-client 的 signIn/signUp 完成邮件密码认证；
 * 登录成功后跳转到 location.state.from，没有来源时回首页。所有文案走 i18n。
 */
import { useI18n } from '@/i18n';
import { signIn, signUp } from '@/lib/auth-client';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export function Login() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const onFinish = async (values: { email: string; password: string; name?: string }) => {
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await signIn.email({ email: values.email, password: values.password })
          : await signUp.email({
              email: values.email,
              password: values.password,
              name: values.name ?? '',
            });
      if (result.error) {
        setError(result.error.message ?? '操作失败');
        return;
      }
      navigate(from, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '75vh', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Title level={3}>{t(mode === 'login' ? 'login.title' : 'register.title')}</Title>
        <Paragraph type="secondary">
          {t(mode === 'login' ? 'login.subtitle' : 'register.subtitle')}
        </Paragraph>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          {mode === 'register' && (
            <Form.Item
              label={t('login.name')}
              name="name"
              rules={[{ required: true, min: 2 }]}
            >
              <Input placeholder={t('login.namePlaceholder')} />
            </Form.Item>
          )}
          <Form.Item
            label={t('login.email')}
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label={t('login.password')}
            name="password"
            rules={[{ required: true, min: 8, message: t('login.passwordRule') }]}
          >
            <Input.Password placeholder={t('login.passwordPlaceholder')} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {t(mode === 'login' ? 'login.submit' : 'login.registerSubmit')}
          </Button>
        </Form>
        <Button
          type="link"
          block
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {t(mode === 'login' ? 'login.toRegister' : 'login.toLogin')}
        </Button>
      </Card>
    </div>
  );
}
