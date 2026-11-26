/**
 * 图片管理页：列出所有已上传图片，支持预览、复制链接、删除。
 */
import { useI18n } from '@/i18n';
import { useDeleteImage, useImages } from '@/api/notes';
import { Button, Empty, Popconfirm, Typography, message } from 'antd';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

export function Images() {
  const { t } = useI18n();
  const { data, isLoading } = useImages();
  const del = useDeleteImage();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      message.success('Copied');
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Title level={2} className="!mb-0">{t('images.title')}</Title>
        <Text type="secondary" className="!text-xs">({data?.length ?? 0})</Text>
      </div>
      <Paragraph type="secondary">{t('images.empty')}</Paragraph>

      {isLoading && <Paragraph type="secondary">{t('admin.loading')}</Paragraph>}
      {!isLoading && data?.length === 0 && <Empty description={t('images.empty')} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.map((img) => (
          <div key={img.name} className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white">
            <img src={img.url} alt={img.name} className="h-36 w-full object-cover" />
            <div className="p-3">
              <Text className="!block !truncate !text-xs" title={img.name}>{img.name}</Text>
              <Text type="secondary" className="!text-xs">
                {(img.size / 1024).toFixed(1)} KB · {img.createdAt.slice(0, 10)}
              </Text>
              <div className="mt-2 flex gap-2">
                <Button size="small" onClick={() => copy(img.url)}>{copied === img.url ? '✓' : 'URL'}</Button>
                <Popconfirm
                  title={t('images.deleteConfirm')}
                  onConfirm={() => del.mutate(img.name, { onSuccess: () => message.success(t('admin.saved')) })}
                >
                  <Button size="small" danger>{t('admin.delete')}</Button>
                </Popconfirm>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
