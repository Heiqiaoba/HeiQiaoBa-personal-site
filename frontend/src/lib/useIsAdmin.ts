/**
 * 判断当前会话是否为作者（admin）。
 * 仅用于前端体验层（显示写作入口），真正的安全边界在后端 requireAdmin。
 */
import { useSession } from './auth-client';

export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return (session?.user as { role?: string } | undefined)?.role === 'admin';
}
