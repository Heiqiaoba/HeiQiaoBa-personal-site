/**
 * 应用根组件：定义整体布局与路由表。
 *
 * 由脚本从全栈模板裁剪生成，已移除演示业务（Todo / 用户列表 / 管理端）。
 * 当前仅保留骨架路由：首页、登录页与 404 兜底。真正的安全边界在后端接口。
 */
import { AppHeader } from '@/components/AppHeader';
import { Home } from '@/routes/Home';
import { Login } from '@/routes/Login';
import { NotFound } from '@/routes/NotFound';
import { ConfigProvider, Layout } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Route, Routes } from 'react-router-dom';

const { Content, Footer } = Layout;

export function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <Layout className="min-h-screen">
        <AppHeader />
        <Content className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
        <Footer className="!bg-transparent !text-center">
          HeiQiaoBa-personal-site © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
