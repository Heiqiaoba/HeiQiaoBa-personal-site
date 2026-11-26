/**
 * 全局应用头部：站名、语言切换与会话操作区。
 * 站名与登录/退出文案走 i18n；已移除演示用的管理端入口。
 */
import { useI18n } from '@/i18n';
import { signOutAndClear, useSession } from '@/lib/auth-client';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { LogoutOutlined } from '@ant-design/icons';
import { Button, Layout, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Header } = Layout;
const { Title, Text } = Typography;

export function AppHeader() {
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const { t, lang, setLang } = useI18n();
  return (
    <Header className="flex items-center justify-between !border-b !border-black/5 !bg-white/90 !px-6 !shadow-none">
      <Link to="/" className="flex items-center gap-2">
        <Title level={4} className="!m-0 !font-semibold !tracking-tight">
          {t('site.name')}
        </Title>
      </Link>
      <Space size="small">
        <Button
          type="text"
          size="small"
          aria-label="switch language"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          {t('lang.switch')}
        </Button>
        {session ? (
          <>
            {isAdmin && (
              <Link to="/write">
                <Button type="link" size="small">{t('nav.write')}</Button>
              </Link>
            )}
            <Text type="secondary" className="!hidden sm:!inline">
              {session.user.email}
            </Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => void signOutAndClear()}
            >
              {t('nav.logout')}
            </Button>
          </>
        ) : (
          <Link to="/login">
            <Button type="primary" size="small">
              {t('nav.login')}
            </Button>
          </Link>
        )}
      </Space>
    </Header>
  );
}
