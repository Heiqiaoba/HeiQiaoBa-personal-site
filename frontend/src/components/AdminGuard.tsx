/**
 * 管理端路由守卫（体验层）：先要求登录，再校验 admin 角色。
 * 真正的安全边界在后端 requireAdmin；这里只负责友好提示。
 */
import { useI18n } from '@/i18n';
import { useSession } from '@/lib/auth-client';
import { Alert, Spin } from 'antd';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/lib/permissions';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const { t } = useI18n();
  const location = useLocation();
  const { hasAny, data: perms, isLoading } = usePermissions();

  if (isPending || isLoading) return <div className="p-16 text-center"><Spin /></div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // 写作台任一写权限即可进入（不再限定死 admin 角色）
  if (perms && !hasAny('note:read', 'note:create', 'note:update', 'image:read', 'user:read', 'role:read', 'analytics:read')) {
    return <Alert type="warning" message={t('admin.noPermission')} showIcon />;
  }
  return <>{children}</>;
}

/**
 * 细粒度路由守卫：需要指定权限才能访问。
 */
export function PermissionGuard({ perm, children }: { perm: string; children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const { has, isLoading } = usePermissions();
  const { t } = useI18n();
  const location = useLocation();

  if (isPending || isLoading) return <div className="p-16 text-center"><Spin /></div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!has(perm)) return <Alert type="warning" message={t('admin.noPermission')} showIcon />;
  return <>{children}</>;
}
