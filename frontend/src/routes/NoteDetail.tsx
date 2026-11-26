/**
 * 公开笔记详情页（vanBlog 风格）：阅读进度条、Markdown 正文、目录 TOC、
 * 代码复制、上一篇/下一篇。仅已发布笔记对访客可见。
 */
import { useI18n } from '@/i18n';
import { useNote, useNotes } from '@/api/notes';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { ReadingProgress } from '@/components/ReadingProgress';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import { Button, Spin, Tag, Typography, message } from 'antd';
import { marked } from 'marked';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Note } from '@/api/contract';

const { Title, Paragraph } = Typography;

type TocItem = { level: number; text: string; id: string };

/** 从 Markdown 提取标题生成 TOC，并给渲染后的 h1-h3 加 id */
function buildToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split('\n');
  let h2 = 0, h3 = 0;
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1]!.length;
    const text = m[2]!.replace(/[*`_]/g, '').trim();
    let id: string;
    if (level === 1) id = 'toc-title';
    else if (level === 2) id = `toc-2-${++h2}`;
    else id = `toc-3-${++h3}`;
    items.push({ level, text, id });
  }
  return items;
}

function injectHeadingIds(html: string): string {
  let h2 = 0, h3 = 0;
  return html.replace(/<h([123])>(.*?)<\/h\1>/g, (_all, level: string, inner: string) => {
    const lvl = Number(level);
    const id = lvl === 1 ? 'toc-title' : lvl === 2 ? `toc-2-${++h2}` : `toc-3-${++h3}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

export function NoteDetail() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const { data: note, isLoading, isError } = useNote(slug);
  const { data: allNotes } = useNotes({ page: 1, pageSize: 100 });

  useEffect(() => {
    // 给代码块加复制按钮
    const timer = setTimeout(() => {
      document.querySelectorAll('.prose pre').forEach((pre) => {
        // 检查与插入都限定在 pre 自身：pre 有 relative，absolute 按钮才会定位在代码块右上角
        if (pre.querySelector('.copy-code')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-code absolute right-2 top-2 rounded bg-white/10 px-2 py-1 text-xs text-gray-200 hover:bg-white/20';
        btn.textContent = 'Copy';
        btn.onclick = () => {
          const code = pre.querySelector('code')?.textContent ?? '';
          void navigator.clipboard.writeText(code).then(() => message.success('Copied'));
        };
        pre.classList.add('relative');
        pre.appendChild(btn); // 插进 pre 里，而不是父容器
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [note]);

  const html = useMemo(
    () => (note ? injectHeadingIds(marked.parse(note.content, { async: false }) as string) : ''),
    [note],
  );
  const toc = useMemo(() => (note ? buildToc(note.content) : []), [note]);

  const { prev, next } = useMemo(() => {
    const items = allNotes?.items ?? [];
    const idx = items.findIndex((n) => n.id === note?.id);
    return {
      prev: idx > 0 ? items[idx - 1] : undefined,
      next: idx >= 0 && idx < items.length - 1 ? items[idx + 1] : undefined,
    };
  }, [allNotes, note]);

  useDocumentMeta({
    title: note ? `${note.title} · 黑巧巴笔记` : '黑巧巴笔记',
    description: note?.summary || undefined,
    jsonLd: note
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: note.title,
          description: note.summary,
          datePublished: note.publishedAt ?? note.createdAt,
          dateModified: note.updatedAt,
          author: { '@type': 'Person', name: '黑巧巴' },
        }
      : undefined,
  });

  if (isLoading) return <div className="p-16 text-center"><Spin /></div>;
  if (isError || !note)
    return (
      <div className="mx-auto max-w-[720px] px-6 py-14">
        <Paragraph type="danger">{t('notes.notFound')}</Paragraph>
        <Link to="/notes"><Button type="link" className="!px-0">{t('notes.back')}</Button></Link>
      </div>
    );

  return (
    <>
      <ReadingProgress />
      <div className="mx-auto flex max-w-[1080px] gap-10 px-6 py-12">
        <article className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link to="/notes"><Button type="link" className="!px-0">{t('notes.back')}</Button></Link>
            {isAdmin && (
              <Link to={`/write/${note.id}`}>
                <Button type="link" size="small" className="!px-0">{t('notes.edit')}</Button>
              </Link>
            )}
          </div>
          <Title level={1} className="!mb-3 !text-[2.2rem] !leading-tight">{note.title}</Title>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            {note.publishedAt && (
              <span className="text-sm text-[color:var(--text-secondary)]">
                {t('notes.date')}: {new Date(note.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {note.summary && (
            <Paragraph type="secondary" className="!border-l-[3px] !border-[color:var(--brand)] !pl-4 !text-base">
              {note.summary}
            </Paragraph>
          )}
          <div className="prose max-w-none !leading-[1.9] text-[color:var(--text)]"
            dangerouslySetInnerHTML={{ __html: html }} />

          {/* 上一篇/下一篇 */}
          <div className="mt-12 grid gap-4 border-t border-[color:var(--border)] pt-6 sm:grid-cols-2">
            {prev ? (
              <Link to={`/notes/${prev.slug}`} className="rounded-lg border border-[color:var(--border)] p-4 no-underline hover:bg-black/[0.02]">
                <div className="text-xs text-[color:var(--text-secondary)]">← {t('notes.prev')}</div>
                <div className="mt-1 truncate text-sm text-[color:var(--text)]">{prev.title}</div>
              </Link>
            ) : <div />}
            {next && (
              <Link to={`/notes/${next.slug}`} className="rounded-lg border border-[color:var(--border)] p-4 text-right no-underline hover:bg-black/[0.02]">
                <div className="text-xs text-[color:var(--text-secondary)]">{t('notes.next')} →</div>
                <div className="mt-1 truncate text-sm text-[color:var(--text)]">{next.title}</div>
              </Link>
            )}
          </div>
        </article>

        {/* 目录 TOC */}
        {toc.length > 1 && (
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">{t('notes.toc')}</div>
              <nav className="flex flex-col gap-1 border-l border-[color:var(--border)] pl-3">
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`}
                    className={`text-sm no-underline hover:text-[color:var(--brand)] ${item.level === 3 ? 'pl-3' : ''} text-[color:var(--text-secondary)]`}>
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
