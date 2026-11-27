/**
 * 公开笔记详情页（vanBlog 风格）：阅读进度条、Markdown 正文、目录 TOC、
 * 代码复制、上一篇/下一篇。仅已发布笔记对访客可见。
 */
import { useI18n } from '@/i18n';
import { useLikeStatus, useNote, useNotes, useToggleLike } from '@/api/notes';
import { Can } from '@/lib/permissions';
import { track } from '@/lib/telemetry';
import { ReadingProgress } from '@/components/ReadingProgress';
import { MarkdownView } from '@/components/MarkdownView';
import { Comments } from '@/components/Comments';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import GithubSlugger from 'github-slugger';
import { Button, Spin, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const { Title, Paragraph } = Typography;

type TocItem = { level: number; text: string; id: string };

/**
 * 从 Markdown 提取标题生成 TOC。
 * 用 github-slugger 生成 id，与 MarkdownView 里的 rehype-slug 完全一致，
 * 保证目录锚点能正确跳到对应标题。
 */
function buildToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1]!.length;
    const text = m[2]!.replace(/[*`_]/g, '').trim();
    items.push({ level, text, id: slugger.slug(text) });
  }
  return items;
}

export function NoteDetail() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { data: note, isLoading, isError } = useNote(slug);
  const { data: allNotes } = useNotes({ page: 1, pageSize: 100 });
  const { data: likeStatus } = useLikeStatus(note?.id);
  const toggleLike = useToggleLike(note?.id ?? '');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(likeStatus?.liked ?? false);
  }, [likeStatus?.liked]);

  // 详情页埋点：记录 note_view（用户无感，userId 由后端从会话补全）
  useEffect(() => {
    if (note) track('note_view', { slug: note.slug, noteId: note.id });
  }, [note?.id]);

  const onLike = async () => {
    if (!note || toggleLike.isPending) return;
    const next = !liked;
    setLiked(next); // 乐观更新
    try {
      const res = await toggleLike.mutateAsync();
      setLiked(res.liked);
    } catch {
      setLiked(!next); // 失败回滚
    }
  };

  // TOC 从 Markdown 标题生成；rehype-slug 会自动给渲染后的标题加同样的 id
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
            <Can perm="note:update">
              <Link to={`/write/${note.id}`}>
                <Button type="link" size="small" className="!px-0">{t('notes.edit')}</Button>
              </Link>
            </Can>
          </div>
          <Title level={1} className="!mb-3 !text-[2.2rem] !leading-tight">{note.title}</Title>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            {note.publishedAt && (
              <span className="text-sm text-[color:var(--text-secondary)]">
                {t('notes.date')}: {new Date(note.publishedAt).toLocaleDateString()}
              </span>
            )}
            <span className="text-sm text-[color:var(--text-secondary)]">
              {note.viewCount} {t('notes.views')}
            </span>
            <Button
              size="small"
              type={liked ? 'primary' : 'default'}
              onClick={onLike}
              disabled={toggleLike.isPending}
              className="!ml-1"
            >
              {liked ? '♥ ' : '♡ '}{note.likeCount} {t('notes.likes')}
            </Button>
          </div>
          {note.summary && (
            <Paragraph type="secondary" className="!border-l-[3px] !border-[color:var(--brand)] !pl-4 !text-base">
              {note.summary}
            </Paragraph>
          )}
          <MarkdownView content={note.content} />
          <Comments slug={note.slug} />

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
