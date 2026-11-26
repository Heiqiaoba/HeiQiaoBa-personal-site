/**
 * 笔记编辑器：基础信息 + Markdown 分栏实时预览 + 轻量工具栏 + 字数统计。
 * 新建/编辑共用；marked 已安装，直接用于预览渲染。
 */
import { useI18n } from '@/i18n';
import { useAdminNote, useCreateNote, useUpdateNote } from '@/api/notes';
import { Button, Form, Input, Select, Spin, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';

const { Title, Text } = Typography;

type FormValues = {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  status: 'draft' | 'published';
  tags?: string[];
};

/** 从标题生成 slug：英文转小写连字符，中文按码点短码，避免空 slug */
function slugFromTitle(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (ascii) return ascii.slice(0, 100);
  // 纯中文标题：用字符码点拼接成短码
  return Array.from(title)
    .slice(0, 12)
    .map((c) => c.codePointAt(0)?.toString(36) ?? '')
    .join('-')
    .slice(0, 100) || 'note';
}

export function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const isNew = !id;
  const { data: note, isLoading } = useAdminNote(id ?? '');
  const create = useCreateNote();
  const update = useUpdateNote();
  const [ready, setReady] = useState(isNew);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (note) {
      form.setFieldsValue({
        slug: note.slug,
        title: note.title,
        summary: note.summary,
        content: note.content,
        status: note.status,
        tags: note.tags,
      });
      setContent(note.content);
      setTitle(note.title);
      setReady(true);
    }
  }, [note, form]);

  const wordCount = content.replace(/\s/g, '').length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 400));
  const html = content ? (marked.parse(content, { async: false }) as string) : '';

  /** 工具栏：在光标处插入 Markdown 片段 */
  const wrap = (before: string, after = '', placeholder = '') => {
    const area = contentRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    form.setFieldValue('content', next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const onFinish = async (values: FormValues) => {
    const payload = {
      slug: values.slug,
      title: values.title,
      summary: values.summary ?? '',
      content: values.content,
      status: values.status,
      tags: values.tags ?? [],
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ ...payload, id: id! });
      message.success(t('admin.saved'));
      navigate('/write');
    } catch {
      // 错误由 api 客户端归一化并拦截展示
    }
  };

  if (isLoading || !ready) return <div className="p-16 text-center"><Spin /></div>;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Title level={2} className="!mb-0">{isNew ? t('admin.new') : t('admin.edit')}</Title>
        <Button onClick={() => navigate('/write')}>{t('admin.cancel')}</Button>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'draft', tags: [] }}>
        {/* 基础信息 */}
        <div className="mb-6 rounded-xl border border-black/10 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item label={t('admin.titleField')} name="title" rules={[{ required: true, max: 200 }]}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('admin.titleField')}
              />
            </Form.Item>
            <Form.Item label={t('admin.slug')} name="slug" rules={[{ required: true, pattern: /^[a-z0-9-]+$/ }]}>
              <Input
                addonAfter={
                  <Button
                    type="link"
                    size="small"
                    className="!px-1 !py-0"
                    onClick={() => form.setFieldValue('slug', slugFromTitle(title))}
                  >
                    {t('desk.generateSlug')}
                  </Button>
                }
              />
            </Form.Item>
          </div>
          <Form.Item label={t('admin.summary')} name="summary">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <div className="grid gap-4 sm:grid-cols-2">
            <Form.Item label={t('admin.status')} name="status">
              <Select
                options={[
                  { value: 'draft', label: t('admin.status.draft') },
                  { value: 'published', label: t('admin.status.published') },
                ]}
              />
            </Form.Item>
            <Form.Item label={t('admin.tagsField')} name="tags">
              <Select mode="tags" tokenSeparators={[',']} />
            </Form.Item>
          </div>
        </div>

        {/* 正文：分栏实时预览 */}
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b border-black/5 bg-black/[0.02] px-3 py-2">
            <Button size="small" type="text" onClick={() => wrap('**', '**', 'bold')}>{t('desk.toolbar.bold')}</Button>
            <Button size="small" type="text" onClick={() => wrap('*', '*', 'italic')}>{t('desk.toolbar.italic')}</Button>
            <Button size="small" type="text" onClick={() => wrap('## ', '', 'heading')}>{t('desk.toolbar.heading')}</Button>
            <Button size="small" type="text" onClick={() => wrap('[', '](url)', 'text')}>{t('desk.toolbar.link')}</Button>
            <Button size="small" type="text" onClick={() => wrap('`', '`', 'code')}>{t('desk.toolbar.code')}</Button>
            <Button size="small" type="text" onClick={() => wrap('> ', '', 'quote')}>{t('desk.toolbar.quote')}</Button>
            <Button size="small" type="text" onClick={() => wrap('- ', '', 'item')}>{t('desk.toolbar.list')}</Button>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-black/5 md:border-b-0 md:border-r">
              <div className="border-b border-black/5 px-4 py-2 text-xs text-black/40">{t('desk.editor')}</div>
              <Form.Item name="content" rules={[{ required: true }]} className="!mb-0">
                <Input.TextArea
                  ref={contentRef as never}
                  rows={22}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="!rounded-none !border-0 !shadow-none"
                  style={{ fontFamily: 'ui-monospace, monospace', resize: 'vertical' }}
                />
              </Form.Item>
            </div>
            <div>
              <div className="border-b border-black/5 px-4 py-2 text-xs text-black/40">{t('desk.preview')}</div>
              <div
                className="prose prose-neutral max-w-none px-5 py-4 !leading-[1.8] text-black/85"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Text type="secondary" className="!text-xs">
            {wordCount} {t('desk.words')} · {readMinutes} {t('desk.readTime')}
          </Text>
          <Button type="primary" htmlType="submit" loading={create.isPending || update.isPending}>
            {t('admin.save')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
