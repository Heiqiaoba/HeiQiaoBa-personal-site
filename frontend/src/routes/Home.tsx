/**
 * 首页：数字花园风格的个人站入口。
 *
 * 结构：Hero 问候（带徽标）→ 三栏内容入口（笔记/项目/关于）→ 最近笔记列表 →
 * 关于片段 → 站点状态。所有文案走 i18n，支持中英文切换。
 * 启动时请求 /api/v1/health，直观验证前后端连通。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import { api } from '@/api/client';
import { Button, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
type HealthState = 'loading' | 'ok' | 'error';

/** 三张内容入口卡片 */
const cards = [
  { titleKey: 'home.section.notes', descKey: 'home.section.notes.desc', to: '/notes', tone: 'bg-amber-50' },
  { titleKey: 'home.section.projects', descKey: 'home.section.projects.desc', to: '/projects', tone: 'bg-emerald-50' },
  { titleKey: 'home.section.about', descKey: 'home.section.about.desc', to: '/about', tone: 'bg-sky-50' },
] as const;

export function Home() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthState>('loading');
  const { data: notes } = useNotes({ page: 1, pageSize: 5 });

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
    <div className="mx-auto max-w-[860px] px-6">
      {/* Hero */}
      <section className="border-b border-black/5 py-16 sm:py-20">
        <span className="inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs tracking-wide text-black/55">
          {t('home.hero.badge')}
        </span>
        <Title level={1} className="!mt-5 !mb-4 !text-[2.6rem] !font-semibold !leading-tight !tracking-tight sm:!text-[3.2rem]">
          {t('home.title')}
        </Title>
        {t('site.tagline') && (
          <Paragraph className="!text-lg !text-black/50">{t('site.tagline')}</Paragraph>
        )}
        <Paragraph className="!max-w-[640px] !text-[1.1rem] !leading-[1.9] !text-black/70">
          {t('home.intro')}
        </Paragraph>
      </section>

      {/* 内容入口卡片 */}
      <section className="grid gap-4 py-12 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.titleKey}
            to={card.to}
            className={`group rounded-2xl ${card.tone} p-6 no-underline transition-transform hover:-translate-y-1`}
          >
            <Title level={4} className="!mb-2 !text-black/85">
              {t(card.titleKey)}
            </Title>
            <Paragraph className="!mb-3 !text-sm !leading-relaxed !text-black/55">
              {t(card.descKey)}
            </Paragraph>
            <Text className="!text-sm !font-medium !text-black/45 group-hover:!text-black/70">
              {t('home.viewAll')}
            </Text>
          </Link>
        ))}
      </section>

      {/* 最近笔记 + 关于片段 */}
      <section className="grid gap-12 border-t border-black/5 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <Title level={3} className="!mt-0 !mb-5 !text-xl">{t('home.section.notes')}</Title>
          {notes?.items.length ? (
            <ul className="m-0 list-none space-y-4 p-0">
              {notes.items.map((note, index) => (
                <li key={note.id} className="flex items-baseline gap-3 border-b border-black/5 pb-3">
                  <span className="text-xs tabular-nums text-black/30">0{index + 1}</span>
                  <Link to={`/notes/${note.slug}`} className="text-black/80 hover:text-black">
                    {note.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Paragraph type="secondary">{t('notes.empty')}</Paragraph>
          )}
          <Link to="/notes">
            <Button type="link" className="!px-0">{t('home.viewAll')}</Button>
          </Link>
        </div>
        <div>
          <Title level={3} className="!mt-0 !mb-5 !text-xl">{t('home.section.about')}</Title>
          <Paragraph className="!leading-[1.9] !text-black/65">{t('home.about.text')}</Paragraph>
          <Link to="/about">
            <Button type="link" className="!px-0">{t('home.viewAll')}</Button>
          </Link>
        </div>
      </section>

      {/* 站点状态 */}
      <footer className="border-t border-black/5 py-8 text-sm text-black/45">
        <Text type="secondary">{t('home.health.title')}: </Text>
        {health === 'loading' && <Text type="secondary">{t('home.health.loading')}</Text>}
        {health === 'ok' && <Text type="success">{t('home.health.ok')}</Text>}
        {health === 'error' && <Text type="danger">{t('home.health.error')}</Text>}
      </footer>
    </div>
  );
}
