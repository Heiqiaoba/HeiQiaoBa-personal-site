/**
 * 埋点看板数据访问（仅管理员可用，后端 requireAdmin 守卫）。
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export type TelemetryDashboard = {
  summary: { total: number; visitors: number; days: number };
  byType: Array<{ type: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  recent: Array<{
    id: string;
    type: string;
    path: string;
    sessionId: string;
    props: Record<string, string | number | boolean | null> | null;
    createdAt: string;
  }>;
};

export function useTelemetryDashboard(days: number) {
  return useQuery({
    queryKey: ['telemetry-dashboard', days],
    queryFn: () => api.get<TelemetryDashboard>('/telemetry/dashboard', { params: { days } }),
  });
}
