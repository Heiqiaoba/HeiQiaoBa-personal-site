/**
 * 全局应用头部：展示项目名与会话操作区。
 * 由脚本从模板裁剪生成，已移除演示用的管理端入口。
 */
import { signOutAndClear, useSession } from '@/lib/auth-client';
import { LogoutOutlined } from '@ant-design/icons';
import { Button, Layout, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Header } = Layout;
const { Title, Text } = Typography;

export function AppHeader() {
  const { data: session } = useSession();
  return (
    <Header className="flex items-center justify-between !bg-white !px-6 !shadow-sm">
      <Link to="/" className="flex items-center gap-2">
        <Title level={4} className="!m-0">HeiQiaoBa-personal-site</Title>
      </Link>
      <Space>
        {session ? (
          <>
            <Text type="secondary">{session.user.email}</Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => void signOutAndClear()}>
              退出
            </Button>
          </>
        ) : (
          <Link to="/login">
            <Button type="primary">登录 / 注册</Button>
          </Link>
        )}
      </Space>
    </Header>
  );
}
