/**
 * 公共权限工具（前端体验层）：统一的能力判定入口，所有按钮/菜单都通过它控制显隐。
 *
 * 数据来源：登录用户调用 GET /api/v1/me/permissions 拿到 { role, permissions }，
 * 缓存到 queryClient。真安全边界在后端 requirePermission 守卫，前端只负责体验。
 *
 * 用法：
 * - hook：const { has, isAdmin } = usePermissions();
 * - 组件：<Can perm="note:create"><Button>新建</Button></Can>
 * - 纯函数：can(sessionData, 'note:delete')（便于测试/非 React 场景）
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useSession } from './auth-client';
import type { ReactNode } from 'react';

export type MyPermissions = { role: string; permissions: string[] };

export const PERMISSIONS_KEY = ['my-permissions'];

/** 当前登录用户的角色与权限；未登录返回空 */
export function useMyPermissions() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: () => api.get<MyPermissions>('/me/permissions'),
    enabled: !!session,
  });
}

/** 纯函数判定：admin 恒有全部权限；其余按权限码列表匹配 */
export function can(data: MyPermissions | undefined, code: string): boolean {
  if (!data) return false;
  return data.role === 'admin' || data.permissions.includes(code);
}

/** hook 版：返回 has(code) 判定函数与常用标记 */
export function usePermissions() {
  const { data, isLoading } = useMyPermissions();
  return {
    data,
    isLoading,
    isAdmin: data?.role === 'admin',
    has: (code: string) => can(data, code),
    /** 任一权限命中即可 */
    hasAny: (...codes: string[]) => codes.some((c) => can(data, c)),
  };
}

/** 声明式权限包裹：无权限时渲染 fallback（默认 null） */
export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has } = usePermissions();
  return <>{has(perm) ? children : fallback}</>;
}
