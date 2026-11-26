/**
 * 轻量 i18n：不引入额外依赖，用上下文提供 t() 与语言切换。
 * 语言持久化到 localStorage，首次访问按浏览器语言自动选择。
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

/** 页面文案字典：key 取自各页面用到的字符串，新增文案时两边都要补。 */
const dict = {
  zh: {
    'site.name': '黑巧笔记',
    'site.tagline': '', // 标语占位：想好后填这里，例如「一些记录，缓慢生长」
    'nav.login': '登录 / 注册',
    'nav.logout': '退出',
    'home.title': '你好，我是黑巧',
    'home.intro': '这里是我记录想法、项目与日常的地方。慢慢写，慢慢长。',
    'home.notes': '最近笔记',
    'home.projects': '项目',
    'home.about': '关于',
    'home.placeholder': '内容正在整理中，敬请期待。',
    'home.health.ok': '已连接 · 后端服务正常',
    'home.health.error': '未连接 · 请确认后端服务已启动',
    'home.health.loading': '检测中…',
    'home.health.title': '站点状态',
    'login.title': '登录',
    'register.title': '注册',
    'login.subtitle': '登录后进入管理后台',
    'register.subtitle': '创建一个账号',
    'login.name': '昵称',
    'login.namePlaceholder': '你的昵称',
    'login.email': '邮箱',
    'login.password': '密码',
    'login.passwordPlaceholder': '至少 8 位',
    'login.passwordRule': '密码至少 8 位',
    'login.submit': '登录',
    'login.registerSubmit': '注册',
    'login.toRegister': '没有账号？去注册',
    'login.toLogin': '已有账号？去登录',
    'notfound.title': '404',
    'notfound.subtitle': '页面不存在',
    'notfound.back': '回首页',
    'error.title': '页面出错了',
    'error.retry': '重试',
    'footer.rights': '版权所有',
    'lang.switch': 'EN',
  },
  en: {
    'site.name': "Heiqiao's Notes",
    'site.tagline': '', // Tagline placeholder: e.g. "Notes on things I build and think about."
    'nav.login': 'Sign in / Sign up',
    'nav.logout': 'Sign out',
    'home.title': "Hi, I'm Heiqiao",
    'home.intro': 'A quiet corner for notes, projects, and everyday thoughts. Written slowly, growing slowly.',
    'home.notes': 'Recent Notes',
    'home.projects': 'Projects',
    'home.about': 'About',
    'home.placeholder': 'Content is being curated. Stay tuned.',
    'home.health.ok': 'Connected · backend is healthy',
    'home.health.error': 'Disconnected · please check the backend service',
    'home.health.loading': 'Checking…',
    'home.health.title': 'Site status',
    'login.title': 'Sign in',
    'register.title': 'Sign up',
    'login.subtitle': 'Sign in to access the admin area',
    'register.subtitle': 'Create an account to get started',
    'login.name': 'Name',
    'login.namePlaceholder': 'Your name',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.passwordPlaceholder': 'At least 8 characters',
    'login.passwordRule': 'Password must be at least 8 characters',
    'login.submit': 'Sign in',
    'login.registerSubmit': 'Sign up',
    'login.toRegister': 'No account? Sign up',
    'login.toLogin': 'Have an account? Sign in',
    'notfound.title': '404',
    'notfound.subtitle': 'Page not found',
    'notfound.back': 'Back home',
    'error.title': 'Something went wrong',
    'error.retry': 'Retry',
    'footer.rights': 'All rights reserved',
    'lang.switch': '中文',
  },
} as const;

export type DictKey = keyof (typeof dict)['zh'];
type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
};

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = 'site-lang';

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    // 隐私模式下 localStorage 不可用，忽略
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** 语言 Provider：包裹在整个应用外层，提供 t(key) 与切换方法。 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // 忽略写入失败
    }
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (key) => dict[lang][key] ?? key,
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** 取 i18n 上下文；必须在 LangProvider 内使用。 */
export function useI18n(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useI18n must be used within LangProvider');
  return ctx;
}
