/**
 * 轻量 i18n：不引入额外依赖，用上下文提供 t() 与语言切换。
 * 语言持久化到 localStorage，首次访问按浏览器语言自动选择。
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

/** 页面文案字典：key 取自各页面用到的字符串，新增文案时两边都要补。 */
const dict = {
  zh: {
    'site.name': '黑巧巴笔记',
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
    'home.hero.badge': '记录 · 整理 · 生长',
    'home.section.notes': '最近笔记',
    'home.section.notes.desc': '把想清楚和没想清楚的东西都写下来。',
    'home.section.projects': '做过的东西',
    'home.section.projects.desc': '一些从想法变成现实的小项目。',
    'home.section.about': '关于我',
    'home.section.about.desc': '简短的自我介绍，以及为什么会有这个站点。',
    'home.viewAll': '查看全部 →',
    'home.more.soon': '更多内容正在整理中',
    'home.note.sample1': '为什么我想有一个自己的地方',
    'home.note.sample2': '数字花园：让笔记慢慢生长',
    'home.note.sample3': '从零搭一套全栈开发脚手架',
    'home.project.sample1': '黑巧巴笔记 · 本站',
    'home.project.sample2': '全栈脚手架 · 模板仓库',
    'home.about.text': '你好，我是黑巧巴。一个喜欢把东西做出来、也喜欢把过程写下来的开发者。这里收集我的笔记、项目和一些零散的想法。',
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
    'notes.empty': '还没有发布笔记',
    'notes.readMore': '阅读全文 →',
    'notes.back': '← 返回列表',
    'notes.notFound': '笔记不存在',
    'notes.publish': '发布',
    'notes.draft': '草稿',
    'notes.tags': '标签',
    'notes.date': '发布时间',
    'admin.title': '管理后台',
    'admin.notes': '笔记管理',
    'admin.new': '新建笔记',
    'admin.edit': '编辑笔记',
    'admin.delete': '删除',
    'admin.deleteConfirm': '确定删除这篇笔记？',
    'admin.slug': 'Slug（URL 短名）',
    'admin.titleField': '标题',
    'admin.summary': '摘要',
    'admin.content': '正文（Markdown）',
    'admin.status': '状态',
    'admin.tagsField': '标签（逗号分隔）',
    'admin.save': '保存',
    'admin.cancel': '取消',
    'admin.saved': '已保存',
    'admin.noPermission': '需要管理员权限',
    'admin.loading': '加载中…',
    'admin.status.published': '已发布',
    'admin.status.draft': '草稿',
    'nav.write': '写作台',
    'home.newNote': '+ 写笔记',
    'notes.edit': '编辑这篇',
    'desk.stats': '篇笔记 · 已发布 · 草稿 · 标签',
    'desk.all': '全部',
    'desk.search': '搜索标题或正文…',
    'desk.empty': '没有匹配的笔记',
    'desk.preview': '实时预览',
    'desk.editor': 'Markdown 编辑',
    'desk.words': '字',
    'desk.readTime': '分钟阅读',
    'desk.generateSlug': '从标题生成',
    'desk.toolbar.bold': '加粗',
    'desk.toolbar.italic': '斜体',
    'desk.toolbar.heading': '标题',
    'desk.toolbar.link': '链接',
    'desk.toolbar.code': '代码',
    'desk.toolbar.quote': '引用',
    'desk.toolbar.list': '列表',
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
    'home.hero.badge': 'Record · Organize · Grow',
    'home.section.notes': 'Recent Notes',
    'home.section.notes.desc': 'Things I figured out — and things I am still figuring out.',
    'home.section.projects': 'Things I Built',
    'home.section.projects.desc': 'A few ideas that turned into something real.',
    'home.section.about': 'About Me',
    'home.section.about.desc': 'A short intro, and why this site exists.',
    'home.viewAll': 'View all →',
    'home.more.soon': 'More coming soon',
    'home.note.sample1': 'Why I wanted a place of my own',
    'home.note.sample2': 'Digital gardening: letting notes grow slowly',
    'home.note.sample3': 'Building a fullstack starter from scratch',
    'home.project.sample1': 'Heiqiao Notes · this site',
    'home.project.sample2': 'Fullstack starter · template repo',
    'home.about.text': "Hi, I'm Heiqiao — a developer who likes building things and writing about the process. This is where my notes, projects, and stray thoughts collect.",
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
    'notes.empty': 'No notes published yet',
    'notes.readMore': 'Read more →',
    'notes.back': '← Back to list',
    'notes.notFound': 'Note not found',
    'notes.publish': 'Published',
    'notes.draft': 'Draft',
    'notes.tags': 'Tags',
    'notes.date': 'Published',
    'admin.title': 'Admin',
    'admin.notes': 'Notes',
    'admin.new': 'New Note',
    'admin.edit': 'Edit Note',
    'admin.delete': 'Delete',
    'admin.deleteConfirm': 'Delete this note?',
    'admin.slug': 'Slug (URL name)',
    'admin.titleField': 'Title',
    'admin.summary': 'Summary',
    'admin.content': 'Content (Markdown)',
    'admin.status': 'Status',
    'admin.tagsField': 'Tags (comma separated)',
    'admin.save': 'Save',
    'admin.cancel': 'Cancel',
    'admin.saved': 'Saved',
    'admin.noPermission': 'Admin access required',
    'admin.loading': 'Loading…',
    'admin.status.published': 'Published',
    'admin.status.draft': 'Draft',
    'nav.write': 'Write',
    'home.newNote': '+ New note',
    'notes.edit': 'Edit this note',
    'desk.stats': 'notes · published · drafts · tags',
    'desk.all': 'All',
    'desk.search': 'Search title or content…',
    'desk.empty': 'No matching notes',
    'desk.preview': 'Live preview',
    'desk.editor': 'Markdown editor',
    'desk.words': 'words',
    'desk.readTime': 'min read',
    'desk.generateSlug': 'Generate from title',
    'desk.toolbar.bold': 'Bold',
    'desk.toolbar.italic': 'Italic',
    'desk.toolbar.heading': 'Heading',
    'desk.toolbar.link': 'Link',
    'desk.toolbar.code': 'Code',
    'desk.toolbar.quote': 'Quote',
    'desk.toolbar.list': 'List',
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
