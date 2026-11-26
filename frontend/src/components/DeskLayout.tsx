/**
 * 写作台布局：左侧固定侧边栏 + 右侧内容区（参考 vanBlog 后台布局）。
 * 侧边栏：概览 / 文章管理 / 草稿箱 / 返回前台。仅管理员可见（外层 AdminGuard 保护）。
 */
import { useI18n } from '@/i18n';
import { Button } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV = [
  { to: '/write', key: 'desk.nav.overview', icon: '◫', end: true },
  { to: '/write/articles', key: 'desk.nav.articles', icon: '▤', end: false },
  { to: '/write/drafts', key: 'desk.nav.drafts', icon: '◱', end: false },
  { to: '/write/settings', key: 'settings.title', icon: '⚙', end: false },
] as const;

export function DeskLayout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();

  return (
    <div className="desk-layout">
      <aside className="desk-sidebar">
        <div className="mb-8 flex items-center gap-2 px-3">
          <span className="text-xl text-[color:var(--brand)]">✦</span>
          <span className="text-base font-semibold text-gray-800">{t('nav.write')}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`desk-nav-item ${active ? 'active' : ''}`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {t(item.key)}
              </Link>
            );
          })}
          <div className="my-4 border-t border-gray-100" />
          <Link to="/" className="desk-nav-item">
            <span className="w-5 text-center">←</span>
            {t('desk.nav.site')}
          </Link>
        </nav>
        <Button
          type="text"
          size="small"
          className="absolute bottom-6 left-6"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          {t('lang.switch')}
        </Button>
      </aside>
      <main className="min-w-0 bg-[color:var(--bg)]">{children}</main>
    </div>
  );
}
