/**
 * 笔记编辑器（全屏）：基础信息 + ByteMD 编辑器（GFM/公式/高亮/图片上传）。
 * Ctrl/Cmd+S 保存，slug 自动生成，字数与阅读时间统计。
 */
import { useI18n } from '@/i18n';
import { useAdminNote, useCreateNote, useUpdateNote } from '@/api/notes';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button, Form, Input, Select, Space, Spin, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

type FormValues = {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  status: 'draft' | 'published';
  tags?: string[];
};

function slugFromTitle(title: string): string {
  const ascii = title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  if (ascii) return ascii.slice(0, 100);
  return Array.from(title).slice(0, 12).map((c) => c.codePointAt(0)?.toString(36) ?? '').join('-').slice(0, 100) || 'note';
}

export function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();
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
        slug: note.slug, title: note.title, summary: note.summary,
        content: note.content, status: note.status, tags: note.tags,
      });
      setContent(note.content);
      setTitle(note.title);
      setReady(true);
    }
  }, [note, form]);

  const wordCount = content.replace(/\s/g, '').length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 400));

  const onFinish = async (values: FormValues) => {
    const payload = {
      slug: values.slug, title: values.title, summary: values.summary ?? '',
      content: values.content, status: values.status, tags: values.tags ?? [],
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ ...payload, id: id! });
      message.success(t('admin.saved'));
      navigate('/write');
    } catch {
      // api 客户端已统一处理错误
    }
  };

  // Ctrl/Cmd+S 保存
  const saveShortcut = useCallback(() => {
    void form.validateFields().then((values) => onFinish(values)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, content, title]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveShortcut();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveShortcut]);

  if (isLoading || !ready) return <div className="p-16 text-center"><Spin /></div>;

  return (
    <div className="min-h-screen bg-[color:var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-center justify-between">
          <Title level={2} className="!mb-0">{isNew ? t('admin.new') : t('admin.edit')}</Title>
          <Space>
            <Text type="secondary" className="!text-xs">{wordCount} {t('desk.words')} · {readMinutes} {t('desk.readTime')}</Text>
            <Button onClick={() => navigate('/write')}>{t('admin.cancel')}</Button>
            <Button type="primary" onClick={saveShortcut} loading={create.isPending || update.isPending}>
              {t('admin.save')} (⌘S)
            </Button>
          </Space>
        </div>

        <div className="mb-6 rounded-xl border border-[color:var(--border)] bg-white p-5">
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'draft', tags: [] }}>
            <div className="grid gap-4 md:grid-cols-2">
              <Form.Item label={t('admin.titleField')} name="title" rules={[{ required: true, max: 200 }]}>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Form.Item>
              <Form.Item label={t('admin.slug')} name="slug" rules={[{ required: true, pattern: /^[a-z0-9-]+$/ }]}>
                <Input
                  addonAfter={
                    <Button type="link" size="small" className="!px-1 !py-0" onClick={() => form.setFieldValue('slug', slugFromTitle(title))}>
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
                <Select options={[
                  { value: 'draft', label: t('admin.status.draft') },
                  { value: 'published', label: t('admin.status.published') },
                ]} />
              </Form.Item>
              <Form.Item label={t('admin.tagsField')} name="tags">
                <Select mode="tags" tokenSeparators={[',']} />
              </Form.Item>
            </div>
          </Form>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-white p-4">
          <Form.Item name="content" rules={[{ required: true }]} className="!mb-0">
            <MarkdownEditor value={content} onChange={setContent} />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}
