/**
 * 基于 ByteMD 的 Markdown 编辑器（vanBlog 同款内核），带 GFM / 数学公式 /
 * 代码高亮 / 图片缩放 / frontmatter 插件。
 * 图片上传走 ByteMD 内置 uploadImages：工具栏按钮、粘贴、拖拽自动触发。
 */
import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import highlight from '@bytemd/plugin-highlight';
import math from '@bytemd/plugin-math';
import mediumZoom from '@bytemd/plugin-medium-zoom';
import frontmatter from '@bytemd/plugin-frontmatter';
import 'bytemd/dist/index.css';
import 'katex/dist/katex.min.css';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type UploadedImage = { url: string; alt: string; title: string };

export function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const plugins = useMemo(
    () => [gfm(), highlight(), math(), mediumZoom(), frontmatter()],
    [],
  );

  /** ByteMD 内置上传回调：拿到 File[]，返回 {url, alt, title}[] */
  const uploadImages = async (files: File[]): Promise<UploadedImage[]> => {
    setUploading(true);
    try {
      const result: UploadedImage[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const { url } = await api.post<{ url: string }>('/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        result.push({
          url: new URL(url, window.location.origin).toString(),
          alt: file.name,
          title: file.name,
        });
      }
      return result;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {uploading && <div className="mb-2 text-xs text-blue-600">图片上传中…</div>}
      <Editor
        value={value}
        onChange={onChange}
        plugins={plugins}
        placeholder={placeholder}
        uploadImages={uploadImages}
        mode="split"
      />
    </div>
  );
}
