/**
 * 管理端路由守卫（体验层）：先要求登录，再校验 admin 角色。
 * 真正的安全边界在后端 requireAdmin；这里只负责友好提示。
 */
import { useI18n } from '@/i18n';
import { useSession } from '@/lib/auth-client';
import { Alert, Spin } from 'antd';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const { t } = useI18n();
  const location = useLocation();

  if (isPending) return <div className="p-16 text-center"><Spin /></div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') return <Alert type="warning" message={t('admin.noPermission')} showIcon />;
  return <>{children}</>;
}
