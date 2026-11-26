/**
 * 应用根组件：定义整体布局与路由表。
 *
 * 公开页面（首页/笔记列表/详情/项目/关于/登录）带公共 Header + Footer；
 * 写作台（/write/*）有独立侧边栏布局，编辑器为全屏，均不显示公共 Header/Footer。
 * 真正的安全边界在后端 requireAdmin；前端 AdminGuard 只负责体验层。
 */
import { AdminGuard } from '@/components/AdminGuard';
import { AppHeader } from '@/components/AppHeader';
import { DeskLayout } from '@/components/DeskLayout';
import { useI18n } from '@/i18n';
import { Home } from '@/routes/Home';
import { Login } from '@/routes/Login';
import { NotFound } from '@/routes/NotFound';
import { NoteDetail } from '@/routes/NoteDetail';
import { Notes } from '@/routes/Notes';
import { Placeholder } from '@/routes/Placeholder';
import { AdminNotes } from '@/routes/admin/AdminNotes';
import { DeskOverview } from '@/routes/admin/DeskOverview';
import { NoteEditor } from '@/routes/admin/NoteEditor';
import { ConfigProvider, Layout } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Route, Routes, useLocation } from 'react-router-dom';

const { Content, Footer } = Layout;

export function App() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  // 写作台页面自行管理布局，不套公共 Header/Footer
  const isDesk = pathname.startsWith('/write');

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1772b4', borderRadius: 6 } }}>
      <Layout className="min-h-screen">
        {!isDesk && <AppHeader />}
        <Content className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:slug" element={<NoteDetail />} />
            <Route path="/projects" element={<Placeholder titleKey="home.projects" />} />
            <Route path="/about" element={<Placeholder titleKey="home.about" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/write" element={<AdminGuard><DeskLayout><DeskOverview /></DeskLayout></AdminGuard>} />
            <Route path="/write/articles" element={<AdminGuard><DeskLayout><AdminNotes key="articles" /></DeskLayout></AdminGuard>} />
            <Route path="/write/drafts" element={<AdminGuard><DeskLayout><AdminNotes key="drafts" mode="drafts" /></DeskLayout></AdminGuard>} />
            <Route path="/write/new" element={<AdminGuard><NoteEditor /></AdminGuard>} />
            <Route path="/write/:id" element={<AdminGuard><NoteEditor /></AdminGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
        {!isDesk && (
          <Footer className="!bg-transparent !text-center !text-black/40">
            © {new Date().getFullYear()} {t('site.name')} · {t('footer.rights')}
          </Footer>
        )}
      </Layout>
    </ConfigProvider>
  );
}
