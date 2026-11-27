/**
 * 应用根组件：定义整体布局与路由表。
 *
 * 公开页面（首页/笔记列表/详情/项目/关于/登录）带公共 Header + Footer；
 * 写作台（/write/*）有独立侧边栏布局，编辑器为全屏，均不显示公共 Header/Footer。
 * 真正的安全边界在后端 requireAdmin；前端 AdminGuard 只负责体验层。
 */
import { AdminGuard, PermissionGuard } from '@/components/AdminGuard';
import { AppHeader } from '@/components/AppHeader';
import { AuthGuard } from '@/components/AuthGuard';
import { DeskLayout } from '@/components/DeskLayout';
import { useI18n } from '@/i18n';
import { Home } from '@/routes/Home';
import { Login } from '@/routes/Login';
import { NotFound } from '@/routes/NotFound';
import { NoteDetail } from '@/routes/NoteDetail';
import { Notes } from '@/routes/Notes';
import { About } from '@/routes/About';
import { Archives } from '@/routes/Archives';
import { Projects } from '@/routes/Projects';
import { AdminNotes } from '@/routes/admin/AdminNotes';
import { DeskOverview } from '@/routes/admin/DeskOverview';
import { NoteEditor } from '@/routes/admin/NoteEditor';
import { Images } from '@/routes/admin/Images';
import { Analytics } from '@/routes/admin/Analytics';
import { Users } from '@/routes/admin/Users';
import { Roles } from '@/routes/admin/Roles';
import { Permissions } from '@/routes/admin/Permissions';
import { Account } from '@/routes/Account';
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
            <Route path="/archives" element={<Archives />} />
            <Route path="/notes/:slug" element={<NoteDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<AuthGuard><Account /></AuthGuard>} />
            <Route path="/write" element={<AdminGuard><DeskLayout><DeskOverview /></DeskLayout></AdminGuard>} />
            <Route path="/write/articles" element={<AdminGuard><DeskLayout><AdminNotes key="articles" /></DeskLayout></AdminGuard>} />
            <Route path="/write/drafts" element={<AdminGuard><DeskLayout><AdminNotes key="drafts" mode="drafts" /></DeskLayout></AdminGuard>} />
            <Route path="/write/images" element={<AdminGuard><DeskLayout><Images /></DeskLayout></AdminGuard>} />
            <Route path="/write/analytics" element={<AdminGuard><PermissionGuard perm="analytics:read"><DeskLayout><Analytics /></DeskLayout></PermissionGuard></AdminGuard>} />
            <Route path="/write/users" element={<AdminGuard><PermissionGuard perm="user:read"><DeskLayout><Users /></DeskLayout></PermissionGuard></AdminGuard>} />
            <Route path="/write/roles" element={<AdminGuard><PermissionGuard perm="role:read"><DeskLayout><Roles /></DeskLayout></PermissionGuard></AdminGuard>} />
            <Route path="/write/permissions" element={<AdminGuard><PermissionGuard perm="permission:read"><DeskLayout><Permissions /></DeskLayout></PermissionGuard></AdminGuard>} />
            <Route path="/write/settings" element={<AdminGuard><DeskLayout><Account /></DeskLayout></AdminGuard>} />
            <Route path="/write/new" element={<AdminGuard><NoteEditor /></AdminGuard>} />
            <Route path="/write/:id" element={<AdminGuard><NoteEditor /></AdminGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
        {!isDesk && (
          <Footer className="!bg-transparent !text-center !text-black/40">
            © {new Date().getFullYear()} {t('site.name')} · {t('footer.rights')}
            <a href="/feed.xml" className="ml-3 hover:text-[color:var(--brand)]">RSS</a>
          </Footer>
        )}
      </Layout>
    </ConfigProvider>
  );
}
