/**
 * 后端唤醒监测（全局单例）：应对 Render 免费层休眠后的 30~50 秒冷启动。
 *
 * 设计目标（对应产品需求）：
 * - 进入页面时后端正常 → 全程静默，不打扰用户；
 * - 首次探测失败 → 进入「唤醒中」，由监听组件显示友好提示，并按固定间隔轮询；
 * - 轮询成功 → 自动刷新之前因后端休眠而失败的查询，并显示一次「已就绪」短暂提示；
 * - 轮询超时 → 显示「暂时不可用」，停止轮询（用户可自行刷新）。
 * - 用户使用过程中 API 挂了（网络错 / 5xx，典型如 502 冷启动）→ 也能触发唤醒流程。
 *
 * 关键实现决策：
 * - 探测用原生 fetch 而非 api 客户端，避免 health 探测失败被 api 拦截器再次当成
 *   API 失败信号，造成递归；
 * - 状态通过 useSyncExternalStore 暴露给 React，组件订阅无需自己写订阅逻辑；
 * - 恢复后调用 queryClient.invalidateQueries() 让所有 active 查询自动重拉，
 *   用户无需手动刷新页面。
 */
import { queryClient } from './queryClient';

export type WakeState = 'idle' | 'checking' | 'waking' | 'ok' | 'failed';

const PROBE_INTERVAL = 3_000; // 轮询间隔
const MAX_RETRIES = 20; // 最多 20 次 ≈ 60 秒，覆盖 30~50 秒冷启动
const PROBE_TIMEOUT = 8_000; // 单次探测超时

class BackendWake {
  private state: WakeState = 'idle';
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private retries = 0;

  getState = (): WakeState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private setState(next: WakeState) {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((fn) => fn());
  }

  /** 原生 fetch 探测健康接口，绕过 api 拦截器 */
  private async probe(): Promise<boolean> {
    try {
      const base = import.meta.env.VITE_API_URL || '/api/v1';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
      try {
        const res = await fetch(`${base}/health`, {
          signal: controller.signal,
          credentials: 'same-origin',
          cache: 'no-store',
        });
        return res.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }

  /**
   * 应用启动时调用一次：静默探测。
   * 成功 → 标记 ok 但不产生任何提示；失败 → 进入唤醒流程。
   */
  async init() {
    if (this.state !== 'idle') return;
    this.setState('checking');
    const ok = await this.probe();
    if (ok) {
      this.setState('ok');
      return;
    }
    this.retries = 0;
    this.setState('waking');
    this.schedulePoll();
  }

  /**
   * API 请求失败时由拦截器调用（网络错误 / 5xx）。
   * 已在唤醒中或已失败时不重复；会话过期（401）等不会调用这里。
   */
  notifyApiFailure() {
    if (this.state === 'waking' || this.state === 'failed' || this.state === 'checking') return;
    this.retries = 0;
    this.setState('waking');
    this.schedulePoll();
  }

  private schedulePoll() {
    if (this.timer) return;
    this.timer = setTimeout(() => void this.poll(), PROBE_INTERVAL);
  }

  private async poll() {
    this.timer = undefined;
    const ok = await this.probe();
    if (ok) {
      this.setState('ok');
      // 让之前因后端休眠而失败的查询自动重拉
      void queryClient.invalidateQueries();
      return;
    }
    this.retries += 1;
    if (this.retries >= MAX_RETRIES) {
      this.setState('failed');
      return;
    }
    this.schedulePoll();
  }
}

export const backendWake = new BackendWake();
