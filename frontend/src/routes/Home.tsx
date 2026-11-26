/**
 * 首页：项目骨架占位页。
 *
 * 启动时向后端 /api/v1/health 发一次请求，用于直观验证前后端连通。
 * 页面本身不含任何业务内容，后续在此逐步添加真实功能。
 */
import { api } from '@/api/client';
import { Alert, Card, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Title, Paragraph, Text } = Typography;
type HealthState = 'loading' | 'ok' | 'error';

export function Home() {
  const [health, setHealth] = useState<HealthState>('loading');

  useEffect(() => {
    let active = true;
    api.get<{ status: string }>('/health')
      .then(() => { if (active) setHealth('ok'); })
      .catch(() => { if (active) setHealth('error'); });
    return () => { active = false; };
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <Title level={2}>项目骨架已就绪</Title>
      <Paragraph type="secondary">
        前端（React + Vite）与后端（Fastify + Drizzle + PostgreSQL）已连通。
        本项目已从模板中移除演示业务代码，可以在此基础上开发真实功能。
      </Paragraph>
      <Card title="后端连通状态">
        {health === 'loading' && <Text type="secondary">检测中…</Text>}
        {health === 'ok' && <Text type="success">已连接 · /api/v1/health 返回正常</Text>}
        {health === 'error' && (
          <Alert type="warning" showIcon message="未连接" description="请确认后端服务已启动。" />
        )}
      </Card>
    </div>
  );
}
