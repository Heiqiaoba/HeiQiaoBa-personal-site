/**
 * 评论组件：Giscus（基于 GitHub Discussions，零数据库、免自建审核）。
 *
 * 配置由后端 GET /public-config 在运行时下发（后端环境变量 GISCUS_*），
 * 四项都填才渲染；未配置时静默隐藏。改配置无需重新构建前端。
 */
import { useEffect, useRef, useState } from 'react';
import { Typography } from 'antd';
import { api } from '@/api/client';

const { Paragraph } = Typography;

type GiscusConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
};

export function Comments({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useState<GiscusConfig | null>(null);

  // 拉取运行时配置（失败静默：评论是可选功能）
  useEffect(() => {
    let active = true;
    api
      .get<{ giscus: GiscusConfig | null }>('/public-config')
      .then((res) => { if (active) setCfg(res.giscus); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cfg || !ref.current) return;
    const container = ref.current;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', cfg.repo);
    script.setAttribute('data-repo-id', cfg.repoId);
    script.setAttribute('data-category', cfg.category);
    script.setAttribute('data-category-id', cfg.categoryId);
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
  }, [cfg, slug]);

  if (!cfg) return null;
  return (
    <section className="mt-12 border-t border-[color:var(--border)] pt-8">
      <Paragraph type="secondary">评论</Paragraph>
      <div ref={ref} />
    </section>
  );
}
