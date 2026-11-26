/**
 * 前台 Markdown 渲染组件（成熟开源方案）：
 * react-markdown + remark-gfm + rehype-highlight + rehype-slug。
 *
 * 代码块用自定义 React 组件渲染：语言标签 + 复制按钮 + 语法高亮。
 * 不再用 marked + 手写 DOM 操作，避免 Copy 按钮错位/重复的问题。
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { message } from 'antd';
import { useState, type ReactNode } from 'react';

/** 从 className="hljs language-xxx" 里取语言名 */
function languageOf(className?: string): string | undefined {
  return className
    ?.split(/\s+/)
    .find((c) => c.startsWith('language-'))
    ?.replace('language-', '');
}

/** 代码块：自带语言标签和复制按钮（React 组件，定位稳定） */
function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  // 取 pure text：react-markdown 传入的 children 可能是多行 <code> 节点
  const text = extractText(children);
  const lang = languageOf(className);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      message.success('已复制');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className="code-block group relative my-5 overflow-hidden rounded-lg bg-[#1f2937]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="text-xs text-gray-400">{lang ?? 'text'}</span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded px-2 py-0.5 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <pre className="!m-0 !overflow-x-auto !bg-transparent !p-4 !text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/** 递归提取 React children 的纯文本 */
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="prose max-w-none !leading-[1.9] text-[color:var(--text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={{
          // 代码块走自定义组件
          pre: ({ children }) => {
            // react-markdown 的 pre 里包裹的是 code 元素
            const child = Array.isArray(children) ? children[0] : children;
            if (child && typeof child === 'object' && 'props' in child) {
              const props = (child as { props: { className?: string; children?: ReactNode } }).props;
              return <CodeBlock className={props.className}>{props.children}</CodeBlock>;
            }
            return <CodeBlock>{children}</CodeBlock>;
          },
          // 行内代码不加 pre 背景
          code: ({ className, children }) => <code className={className}>{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
