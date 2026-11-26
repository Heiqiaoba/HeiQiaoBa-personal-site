/**
 * 全局 TanStack Query 缓存实例。
 *
 * 架构位置：在 main.tsx 中通过 QueryClientProvider 注入整棵组件树，
 * 同时被 ApiAuthSync 在 401 时清空缓存，防止会话切换后残留旧用户数据。
 *
 * 策略：列表数据要求"每次进入页面都重新拉取"，所以 staleTime 设为 0、
 * refetchOnMount 设为 'always'。缓存仍保留（切换时先显示旧数据再刷新），
 * 避免出现空白闪烁；但不会把 30 秒内的旧数据当成新风干。
 */
import { QueryClient } from '@tanstack/react-query';

/** 应用共享的 QueryClient 单例 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: 'always',
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
