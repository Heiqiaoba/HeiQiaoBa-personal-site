/**
 * 动态设置页面 title / description / canonical / OG / JSON-LD。
 * 注意：SPA 里这些由 JS 注入，主流搜索引擎（Google/Bing）能执行 JS 并识别，
 * 但部分爬虫/社交预览只看初始 HTML。彻底解决需要 SSR/预渲染（见 docs/roadmap.md）。
 */
import { useEffect } from 'react';

type MetaOptions = {
  title: string;
  description?: string;
  jsonLd?: Record<string, unknown>;
};

function setMeta(selector: string, attr: string, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useDocumentMeta({ title, description, jsonLd }: MetaOptions) {
  useEffect(() => {
    const desc = description ?? '黑巧巴笔记 —— 记录想法、项目与日常的安静角落';
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);

    const id = 'page-jsonld';
    document.getElementById(id)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, jsonLd]);
}
