/**
 * 首页（vanBlog 风格）：Hero 品牌区 + 文章卡片网格 + 关于侧栏。
 * 中英双语、深浅主题；所有文案走 i18n。
 */
import { useI18n } from '@/i18n';
import { useNotes } from '@/api/notes';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { useSyncExternalStore } from 'react';
import { backendWake } from '@/lib/backendWake';
import { Button, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const cards = [
  { titleKey: 'home.section.notes', descKey: 'home.section.notes.desc', to: '/notes', tone: 'from-amber-50 to-orange-50' },
  { titleKey: 'home.section.projects', descKey: 'home.section.projects.desc', to: '/projects', tone: 'from-emerald-50 to-teal-50' },
  { titleKey: 'home.section.about', descKey: 'home.section.about.desc', to: '/about', tone: 'from-sky-50 to-blue-50' },
] as const;

export function Home() {
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  // 站点状态直接订阅全局唤醒状态：正常时静默显示已连接，唤醒中/失败时显示相应文案
  const wakeState = useSyncExternalStore(backendWake.subscribe, backendWake.getState, backendWake.getState);
  const { data: notes } = useNotes({ page: 1, pageSize: 6 });

  const healthText =
    wakeState === 'ok'
      ? t('home.health.ok')
      : wakeState === 'waking' || wakeState === 'checking'
        ? t('wake.waking.title')
        : wakeState === 'failed'
          ? t('home.health.error')
          : t('home.health.loading');

  return (
    <div className="bg-[color:var(--bg)]">
      {/* Hero */}
      <section className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
          <span className="inline-flex items-center rounded-full bg-[color:var(--brand-soft)] px-3 py-1 text-xs font-medium text-[color:var(--brand)]">
            {t('home.hero.badge')}
          </span>
          <Title level={1} className="!mt-5 !mb-4 !text-[2.6rem] !font-semibold !leading-tight sm:!text-[3.4rem]">
            {t('home.title')}
          </Title>
          {t('site.tagline') && <Paragraph className="!text-lg !text-[color:var(--text-secondary)]">{t('site.tagline')}</Paragraph>}
          <Paragraph className="!max-w-[640px] !text-[1.1rem] !leading-[1.9] !text-[color:var(--text-secondary)]">
            {t('home.intro')}
          </Paragraph>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/notes"><Button type="primary" size="large">{t('home.notes')}</Button></Link>
            <Link to="/about"><Button size="large">{t('home.about')}</Button></Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1080px] px-6 py-12">
        {/* 内容入口卡片 */}
        <section className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.titleKey} to={card.to}
              className={`group rounded-2xl bg-gradient-to-br ${card.tone} p-6 no-underline transition-transform hover:-translate-y-1 dark:from-slate-800 dark:to-slate-900`}>
              <Title level={4} className="!mb-2 !text-gray-800 dark:!text-gray-100">{t(card.titleKey)}</Title>
              <Paragraph className="!mb-3 !text-sm !leading-relaxed !text-gray-600 dark:!text-gray-400">{t(card.descKey)}</Paragraph>
              <Text className="!text-sm !font-medium !text-gray-500 group-hover:!text-[color:var(--brand)]">{t('home.viewAll')}</Text>
            </Link>
          ))}
        </section>

        {/* 最近文章 */}
        <section className="mt-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Title level={2} className="!m-0 !text-2xl">{t('home.section.notes')}</Title>
            {isAdmin && (
              <Link to="/write/new">
                <Button type="link" size="small" className="!px-0">{t('home.newNote')}</Button>
              </Link>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {notes?.items.map((note, i) => (
              <Link key={note.id} to={`/notes/${note.slug}`}
                className="group flex flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 no-underline transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 text-3xl dark:from-slate-800 dark:to-slate-700">
                  {['✦', '◈', '❋', '✧', '◐', '✎'][i % 6]}
                </div>
                <Title level={4} className="!mb-2 !text-base !leading-snug !text-[color:var(--text)] group-hover:!text-[color:var(--brand)]">
                  {note.title}
                </Title>
                <Paragraph className="!mb-3 !line-clamp-2 !flex-1 !text-sm !text-[color:var(--text-secondary)]">
                  {note.summary || note.content.replace(/[#*`>\[\]]/g, '').slice(0, 100)}
                </Paragraph>
                <div className="flex flex-wrap items-center gap-2">
                  {note.tags.slice(0, 2).map((tag) => <Tag key={tag} className="!text-xs">{tag}</Tag>)}
                  <Text className="!text-xs !text-[color:var(--text-muted)]">
                    {(note.publishedAt ?? note.createdAt).slice(0, 10)}
                  </Text>
                </div>
              </Link>
            ))}
            {notes && notes.items.length === 0 && (
              <Paragraph type="secondary">{t('notes.empty')}</Paragraph>
            )}
          </div>
          <Link to="/notes">
            <Button type="link" className="!mt-4 !px-0">{t('home.viewAll')}</Button>
          </Link>
        </section>

        {/* 站点状态 */}
        <footer className="mt-14 border-t border-[color:var(--border)] pt-6 text-sm text-[color:var(--text-muted)]">
          {t('home.health.title')}: {healthText}
        </footer>
      </div>
    </div>
  );
}
