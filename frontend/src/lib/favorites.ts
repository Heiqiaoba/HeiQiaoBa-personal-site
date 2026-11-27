/**
 * 收藏（稍后读）：浏览器本地存储，无需登录。
 * 存 slug 数组，用 useSyncExternalStore 让所有组件同步。
 */
const KEY = 'favorite_notes';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

let listeners = new Set<() => void>();
let snapshot: string[] | null = null;

function emit() {
  snapshot = null;
  listeners.forEach((fn) => fn());
}

export const favorites = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  getSnapshot(): string[] {
    if (snapshot === null) snapshot = read();
    return snapshot;
  },
  toggle(slug: string) {
    const next = read().includes(slug) ? read().filter((s) => s !== slug) : [...read(), slug];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 隐私模式忽略 */ }
    emit();
  },
  has(slug: string) {
    return read().includes(slug);
  },
};
