/**
 * 深浅主题：跟随系统 + 手动切换，持久化到 localStorage。
 * 在 <html> 上切换 class="dark"，CSS 变量在 index.css 中定义。
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'light' | 'dark';
type ThemeCtx = { mode: Mode; toggle: () => void };
const Ctx = createContext<ThemeCtx | null>(null);
const KEY = 'site-theme';

function initial(): Mode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  }, [mode]);
  return <Ctx.Provider value={{ mode, toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')) }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
