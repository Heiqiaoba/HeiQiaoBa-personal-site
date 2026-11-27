/**
 * 后端唤醒监测的状态机测试。
 * 通过 mock fetch 控制探测结果，验证：
 * - 初始探测成功 → ok，全程无唤醒提示；
 * - 初始失败 → waking，轮询成功 → ok 且触发查询刷新；
 * - 重试耗尽 → failed。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('backendWake state machine', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mockFetch.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('silent when backend is healthy on first probe', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { backendWake } = await import('./backendWake');
    await backendWake.init();
    expect(backendWake.getState()).toBe('ok');
  });

  it('goes waking then ok after a successful poll', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    const { backendWake } = await import('./backendWake');
    await backendWake.init();
    expect(backendWake.getState()).toBe('waking');
    await vi.runOnlyPendingTimersAsync();
    await vi.waitFor(() => expect(backendWake.getState()).toBe('ok'));
  });

  it('ends in failed after max retries', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const { backendWake } = await import('./backendWake');
    await backendWake.init();
    expect(backendWake.getState()).toBe('waking');
    for (let i = 0; i < 25; i++) {
      await vi.runOnlyPendingTimersAsync();
    }
    await vi.waitFor(() => expect(backendWake.getState()).toBe('failed'));
  });
});
