/**
 * 评论组件：Giscus（基于 GitHub Discussions，零数据库、免自建审核）。
 *
 * 配置：在 .env 里设置 VITE_GISCUS_REPO / VITE_GISCUS_REPO_ID /
 * VITE_GISCUS_CATEGORY / VITE_GISCUS_CATEGORY_ID。
 * 任一缺失则不渲染评论（未配置时静默隐藏）。
 */
import { useEffect, useRef } from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

declare global {
  interface Window {
    giscus?: { giscus: { setConfig: (config: Record<string, string>) => void } };
  }
}

const cfg = {
  repo: import.meta.env.VITE_GISCUS_REPO,
  repoId: import.meta.env.VITE_GISCUS_REPO_ID,
  category: import.meta.env.VITE_GISCUS_CATEGORY,
  categoryId: import.meta.env.VITE_GISCUS_CATEGORY_ID,
};
const enabled = Boolean(cfg.repo && cfg.repoId && cfg.category && cfg.categoryId);

export function Comments({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const container = ref.current;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', cfg.repo!);
    script.setAttribute('data-repo-id', cfg.repoId!);
    script.setAttribute('data-category', cfg.category!);
    script.setAttribute('data-category-id', cfg.categoryId!);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', slug);
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    container.appendChild(script);
    return () => { container.innerHTML = ''; };
  }, [slug]);

  if (!enabled) return null;
  return (
    <section className="mt-12 border-t border-[color:var(--border)] pt-8">
      <Paragraph type="secondary">评论</Paragraph>
      <div ref={ref} />
    </section>
  );
}
