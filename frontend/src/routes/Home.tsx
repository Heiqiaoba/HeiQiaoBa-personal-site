/**
 * 首页：数字花园风格的个人站入口。
 *
 * 布局：一段自我介绍 + 最近笔记 / 项目 / 关于三个内容入口 + 站点状态。
 * 启动时向后端 /api/v1/health 发一次请求，直观验证前后端连通。
 * 所有可见文案走 i18n，支持中英文切换。
 */
import { useI18n } from '@/i18n';
import { api } from '@/api/client';
import { Button, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
type HealthState = 'loading' | 'ok' | 'error';

/** 内容区块定义：路由暂用锚点占位，后续接入真实页面。 */
const sections = [
  { key: 'home.notes', to: '/notes' },
  { key: 'home.projects', to: '/projects' },
  { key: 'home.about', to: '/about' },
] as const;

export function Home() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthState>('loading');

  useEffect(() => {
    let active = true;
    api
      .get<{ status: string }>('/health')
      .then(() => {
        if (active) setHealth('ok');
      })
      .catch(() => {
        if (active) setHealth('error');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16">
      {/* 自我介绍 */}
      <Title level={1} className="!mb-3 !text-[2.25rem] !font-semibold !tracking-tight">
        {t('home.title')}
      </Title>
      {t('site.tagline') && <Paragraph type="secondary">{t('site.tagline')}</Paragraph>}
      <Paragraph className="!text-[1.05rem] !leading-[1.9] !text-black/70">
        {t('home.intro')}
      </Paragraph>

      {/* 内容入口 */}
      <nav className="mt-10 flex flex-wrap gap-3">
        {sections.map((section) => (
          <Link key={section.key} to={section.to}>
            <Button size="large">{t(section.key)}</Button>
          </Link>
        ))}
      </nav>

      {/* 内容占位：等真实页面做好后替换 */}
      <section className="mt-12 border-t border-black/10 pt-8">
        <Paragraph type="secondary">{t('home.placeholder')}</Paragraph>
      </section>

      {/* 站点状态 */}
      <footer className="mt-16 text-sm text-black/45">
        <Text type="secondary">{t('home.health.title')}: </Text>
        {health === 'loading' && <Text type="secondary">{t('home.health.loading')}</Text>}
        {health === 'ok' && <Text type="success">{t('home.health.ok')}</Text>}
        {health === 'error' && <Text type="danger">{t('home.health.error')}</Text>}
      </footer>
    </div>
  );
}
