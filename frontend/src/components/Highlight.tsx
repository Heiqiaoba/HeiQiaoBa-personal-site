/**
 * 搜索关键词高亮：把文本中匹配 keyword 的部分用 <mark> 包起来（大小写不敏感）。
 * keyword 为空时原样返回文本。
 */
import type { ReactNode } from 'react';

export function Highlight({ text, keyword }: { text: string; keyword: string }): ReactNode {
  const kw = keyword.trim();
  if (!kw) return text;
  const lower = text.toLowerCase();
  const needle = kw.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let idx = lower.indexOf(needle, from);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark key={idx} className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-700">
        {text.slice(idx, idx + kw.length)}
      </mark>,
    );
    from = idx + kw.length;
    idx = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}
