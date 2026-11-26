/**
 * 阅读进度条：固定在页面顶部，随滚动显示阅读百分比。
 */
import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? (h.scrollTop / total) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="fixed left-0 top-0 z-50 h-[3px] bg-[color:var(--brand)] transition-[width] duration-150"
      style={{ width: `${progress}%` }} />
  );
}
