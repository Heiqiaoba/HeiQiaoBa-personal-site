/**
 * 笔记编辑器：新建/编辑共用的表单（标题、slug、摘要、Markdown 正文、状态、标签）。
 */
import { useI18n } from '@/i18n';
import {
  useAdminNote,
  useCreateNote,
  useUpdateNote,
} from '@/api/notes';
import { Button, Form, Input, Select, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const { Title } = Typography;

type FormValues = {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  status: 'draft' | 'published';
  tags?: string[];
};

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
      setReady(true);
    }
  }, [note, form]);

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
      navigate('/admin/notes');
    } catch {
      // 错误由 api 客户端归一化并拦截展示
    }
  };

  if (isLoading || !ready) return <div className="p-16 text-center"><Spin /></div>;

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12">
      <Title level={2}>{isNew ? t('admin.new') : t('admin.edit')}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'draft', tags: [] }}>
        <Form.Item label={t('admin.titleField')} name="title" rules={[{ required: true, max: 200 }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label={t('admin.slug')}
          name="slug"
          rules={[{ required: true, pattern: /^[a-z0-9-]+$/ }]}
          extra="lowercase letters, numbers and hyphens"
        >
          <Input />
        </Form.Item>
        <Form.Item label={t('admin.summary')} name="summary">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Form.Item label={t('admin.content')} name="content" rules={[{ required: true }]}>
          <Input.TextArea rows={16} style={{ fontFamily: 'monospace' }} />
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
        <div className="flex gap-3">
          <Button type="primary" htmlType="submit" loading={create.isPending || update.isPending}>
            {t('admin.save')}
          </Button>
          <Button onClick={() => navigate('/admin/notes')}>{t('admin.cancel')}</Button>
        </div>
      </Form>
    </div>
  );
}
