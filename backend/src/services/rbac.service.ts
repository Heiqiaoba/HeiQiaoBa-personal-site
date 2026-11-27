/**
 * RBAC 业务层：权限/角色/用户角色分配 + 统一权限判定。
 *
 * 设计：
 * - 权限是按钮/接口级的最小单位，code 形如 `note:create`；
 * - 角色是一组权限的集合；用户表的 role 字段存角色 code；
 * - 内置角色 admin（全部权限）与 guest（无权限）由 seed 幂等创建，admin 不可删除；
 * - 公共判定 hasPermission(userId, code)：先查用户 role，再查角色-权限关联。
 *   admin 角色恒有全部权限；未登录/无角色一律无权限。
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

/** 全部内置权限定义（新增功能时在这里登记，同时 seed 进库） */
export const ALL_PERMISSIONS = [
  { code: 'note:read', name: '阅读笔记', description: '查看已发布的笔记', group: 'note' },
  { code: 'note:create', name: '新建笔记', description: '创建笔记', group: 'note' },
  { code: 'note:update', name: '编辑笔记', description: '编辑已有笔记', group: 'note' },
  { code: 'note:delete', name: '删除笔记', description: '删除笔记', group: 'note' },
  { code: 'note:publish', name: '发布笔记', description: '把草稿发布为公开', group: 'note' },
  { code: 'image:read', name: '查看图片库', description: '查看已上传图片', group: 'image' },
  { code: 'image:upload', name: '上传图片', description: '上传图片', group: 'image' },
  { code: 'image:delete', name: '删除图片', description: '删除图片', group: 'image' },
  { code: 'analytics:read', name: '查看埋点看板', description: '查看站点访问统计', group: 'system' },
  { code: 'user:read', name: '查看用户', description: '查看用户列表', group: 'system' },
  { code: 'user:role', name: '分配角色', description: '修改用户角色', group: 'system' },
  { code: 'user:ban', name: '封禁用户', description: '封禁/解封用户', group: 'system' },
  { code: 'user:delete', name: '删除用户', description: '删除用户及其会话数据', group: 'system' },
  { code: 'role:read', name: '查看角色', description: '查看角色列表', group: 'system' },
  { code: 'role:manage', name: '管理角色', description: '新建/编辑/删除角色及分配权限', group: 'system' },
  { code: 'permission:read', name: '查看权限', description: '查看权限列表', group: 'system' },
] as const;

/** 幂等初始化：把内置权限与 guest/admin 角色写入库（不覆盖已有自定义数据） */
export async function seedRbac() {
  await db
    .insert(schema.permissions)
    .values(ALL_PERMISSIONS.map((p) => ({ id: crypto.randomUUID(), ...p })))
    .onConflictDoNothing({ target: schema.permissions.code });

  const [admin] = await db
    .insert(schema.roles)
    .values({ id: crypto.randomUUID(), code: 'admin', name: '管理员', description: '拥有全部权限', system: 1 })
    .onConflictDoNothing({ target: schema.roles.code })
    .returning();
  const [guest] = await db
    .insert(schema.roles)
    .values({ id: crypto.randomUUID(), code: 'guest', name: '访客', description: '仅可阅读，无任何管理权限', system: 1 })
    .onConflictDoNothing({ target: schema.roles.code })
    .returning();

  // onConflictDoNothing 时 returning 为空，重新查一次
  const roles = await db.select().from(schema.roles).where(inArray(schema.roles.code, ['admin', 'guest']));
  const adminRole = admin ?? roles.find((r) => r.code === 'admin');
  const guestRole = guest ?? roles.find((r) => r.code === 'guest');

  if (adminRole) {
    const allPerms = await db.select({ id: schema.permissions.id }).from(schema.permissions);
    await db
      .insert(schema.rolePermissions)
      .values(allPerms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })))
      .onConflictDoNothing();
  }
  // guest 无任何权限：确保清空（内置角色以本代码为准）
  if (guestRole) {
    await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, guestRole.id));
  }
}

/**
 * 系统里"可用"管理员数量（role=admin 且未封禁）。
 * 用于防止把最后一个管理员降级/封禁/删除导致系统无人可管。
 */
export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.role, 'admin'), eq(schema.users.banned, false)));
  return rows.filter((r) => r.id !== excludeUserId).length;
}

/**
 * 公共权限判定：供 requirePermission 守卫与其它业务代码复用。
 * @returns 用户是否拥有指定权限 code
 */
export async function hasPermission(userId: string | undefined, code: string): Promise<boolean> {
  if (!userId) return false;
  const [user] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user?.role) return false;
  if (user.role === 'admin') return true; // 内置管理员恒有全部权限

  const row = await db
    .select({ id: schema.rolePermissions.roleId })
    .from(schema.rolePermissions)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.rolePermissions.roleId))
    .innerJoin(schema.permissions, eq(schema.permissions.id, schema.rolePermissions.permissionId))
    .where(and(eq(schema.roles.code, user.role), eq(schema.permissions.code, code)))
    .limit(1);
  return row.length > 0;
}

/** 取用户的角色 code 与其权限 code 列表（登录时前端也可用） */
export async function permissionsForUser(userId: string): Promise<{ role: string; permissions: string[] }> {
  const [user] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const role = user?.role ?? 'guest';
  if (role === 'admin') {
    const all = await db.select({ code: schema.permissions.code }).from(schema.permissions);
    return { role, permissions: all.map((p) => p.code) };
  }
  const rows = await db
    .select({ code: schema.permissions.code })
    .from(schema.rolePermissions)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.rolePermissions.roleId))
    .innerJoin(schema.permissions, eq(schema.permissions.id, schema.rolePermissions.permissionId))
    .where(eq(schema.roles.code, role));
  return { role, permissions: rows.map((r) => r.code) };
}
