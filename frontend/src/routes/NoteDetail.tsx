/**
 * 公开笔记详情页：按 slug 读取已发布笔记，Markdown 正文渲染。
 */
import { useI18n } from '@/i18n';
import { useNote } from '@/api/notes';
import { Button, Spin, Tag, Typography } from 'antd';
import { marked } from 'marked';
import { Link, useParams } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export function NoteDetail() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const { data: note, isLoading, isError } = useNote(slug);

  if (isLoading) return <div className="p-16 text-center"><Spin /></div>;
  if (isError || !note)
    return (
      <div className="mx-auto max-w-[720px] px-6 py-14">
        <Paragraph type="danger">{t('notes.notFound')}</Paragraph>
        <Link to="/notes"><Button type="link" className="!px-0">{t('notes.back')}</Button></Link>
      </div>
    );

  const html = marked.parse(note.content, { async: false }) as string;

  return (
    <article className="mx-auto max-w-[720px] px-6 py-14">
      <Link to="/notes"><Button type="link" className="!px-0 !mb-4">{t('notes.back')}</Button></Link>
      <Title level={1} className="!mb-3 !text-[2rem]">{note.title}</Title>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {note.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
        {note.publishedAt && (
          <span className="text-sm text-black/45">
            {t('notes.date')}: {new Date(note.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {note.summary && <Paragraph type="secondary" className="!text-base">{note.summary}</Paragraph>}
      <div
        className="prose prose-neutral max-w-none !leading-[1.9] text-black/85"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
