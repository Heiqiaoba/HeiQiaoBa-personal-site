/**
 * 应用根组件：定义整体布局与路由表。
 *
 * 由脚本从全栈模板裁剪生成，已移除演示业务（Todo / 用户列表 / 管理端）。
 * 当前仅保留骨架路由：首页、登录页与 404 兜底。真正的安全边界在后端接口。
 */
import { AppHeader } from '@/components/AppHeader';
import { useI18n } from '@/i18n';
import { Home } from '@/routes/Home';
import { Login } from '@/routes/Login';
import { NotFound } from '@/routes/NotFound';
import { Placeholder } from '@/routes/Placeholder';
import { ConfigProvider, Layout } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Route, Routes } from 'react-router-dom';

const { Content, Footer } = Layout;

export function App() {
  const { t } = useI18n();
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <Layout className="min-h-screen">
        <AppHeader />
        <Content className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notes" element={<Placeholder titleKey="home.notes" />} />
            <Route path="/projects" element={<Placeholder titleKey="home.projects" />} />
            <Route path="/about" element={<Placeholder titleKey="home.about" />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
        <Footer className="!bg-transparent !text-center !text-black/40">
          © {new Date().getFullYear()} {t('site.name')} · {t('footer.rights')}
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
