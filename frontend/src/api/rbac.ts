/**
 * RBAC 管理数据访问：用户/角色/权限的 CRUD。
 * 前端按钮显隐由 lib/permissions 控制，后端每个接口都有 requirePermission 守卫。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  createdAt: string;
};
export type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  system: boolean;
  permissionIds: string[];
};
export type PermissionRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  group: string;
  system: boolean;
};

export function useCreatePermission() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { code: string; name: string; description: string; group: string }) =>
      api.post('/admin/permissions', input),
    onSuccess: invalidate,
  });
}
export function useUpdatePermission() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: {
      id: string;
      code?: string;
      name?: string;
      description?: string;
      group?: string;
    }) => api.patch(`/admin/permissions/${id}`, input),
    onSuccess: invalidate,
  });
}
export function useDeletePermission() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/permissions/${id}`),
    onSuccess: invalidate,
  });
}

export function useUsers() {
  return useQuery({ queryKey: ['rbac', 'users'], queryFn: () => api.get<UserRow[]>('/admin/users') });
}
export function useRoles() {
  return useQuery({ queryKey: ['rbac', 'roles'], queryFn: () => api.get<RoleRow[]>('/admin/roles') });
}
export function usePermissionsList() {
  return useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: () => api.get<PermissionRow[]>('/admin/permissions'),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['rbac'] });
    void qc.invalidateQueries({ queryKey: ['my-permissions'] });
  };
}

export function useSetUserRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: invalidate,
  });
}
export function useDeleteUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: invalidate,
  });
}
export function useBanUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, banned, reason }: { id: string; banned: boolean; reason?: string }) =>
      api.patch(`/admin/users/${id}/ban`, { banned, reason }),
    onSuccess: invalidate,
  });
}
export function useCreateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { code: string; name: string; description: string; permissionIds: string[] }) =>
      api.post('/admin/roles', input),
    onSuccess: invalidate,
  });
}
export function useUpdateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: {
      id: string;
      name?: string;
      description?: string;
      permissionIds?: string[];
    }) => api.patch(`/admin/roles/${id}`, input),
    onSuccess: invalidate,
  });
}
export function useDeleteRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: invalidate,
  });
}
