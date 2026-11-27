/**
 * RBAC 管理路由（挂在 /api/v1）：
 * - GET  /me/permissions        当前用户角色与权限码（登录用户可读）
 * - GET  /admin/users           用户列表（user:read）
 * - PATCH /admin/users/:id/role 分配角色（user:role）
 * - PATCH /admin/users/:id/ban  封禁/解封（user:ban）
 * - DELETE /admin/users/:id     删除用户（user:delete）
 * 所有涉及管理员的操作都有「最后一个可用管理员」保护。
 * - GET  /admin/roles           角色列表（role:read）
 * - POST /admin/roles           新建角色（role:manage）
 * - PATCH /admin/roles/:id      改角色名/描述（role:manage）
 * - DELETE /admin/roles/:id     删除自定义角色（role:manage）
 * - PUT  /admin/roles/:id/permissions  设置角色权限（role:manage）
 * - GET  /admin/permissions     权限列表（permission:read）
 * - POST/PATCH/DELETE /admin/permissions  权限 CRUD（permission:manage，内置权限不可删）
 */
import type { FastifyInstance } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { requireAuth, requirePermission } from '../lib/context.js';
import { Errors } from '../lib/errors.js';
import { parseBody, parseParams } from '../middleware/validation.js';
import { countActiveAdmins, permissionsForUser } from '../services/rbac.service.js';

const idParam = z.object({ id: z.string().min(1) });

const roleCreateSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, '角色 code 只能含小写字母、数字、下划线和连字符'),
  name: z.string().min(1).max(50),
  description: z.string().max(200).default(''),
  permissionIds: z.array(z.string()).default([]),
});
const roleUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  permissionIds: z.array(z.string()).optional(),
});
const rolePermSchema = z.object({ permissionIds: z.array(z.string()) });
const setRoleSchema = z.object({ role: z.string().min(1).max(50) });
const banSchema = z.object({ banned: z.boolean(), reason: z.string().max(200).optional() });

/** 角色 + 其权限 id 列表 */
async function rolesWithPermissions() {
  const roles = await db.select().from(schema.roles).orderBy(schema.roles.system, schema.roles.createdAt);
  const links = await db.select().from(schema.rolePermissions);
  return roles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    system: r.system === 1,
    permissionIds: links.filter((l) => l.roleId === r.id).map((l) => l.permissionId),
  }));
}

export async function rbacRoutes(app: FastifyInstance) {
  // 当前登录用户的角色与权限（前端按此控制按钮显示）
  app.get('/me/permissions', { onRequest: [requireAuth] }, async (req) => {
    return permissionsForUser(req.auth!.userId);
  });

  // ---- 用户管理 ----
  app.get('/admin/users', { onRequest: [requirePermission('user:read')] }, async () => {
    const users = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        banned: schema.users.banned,
        banReason: schema.users.banReason,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(schema.users.createdAt);
    return users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
  });

  app.patch('/admin/users/:id/role', { onRequest: [requirePermission('user:role')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const { role } = parseBody(setRoleSchema, req);
    // 角色必须存在
    const [target] = await db.select({ code: schema.roles.code }).from(schema.roles).where(eq(schema.roles.code, role)).limit(1);
    if (!target) throw Errors.badRequest('Role not found');
    // 保护：禁止把最后一个可用管理员降级
    const [user] = await db.select({ role: schema.users.role, banned: schema.users.banned }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (user?.role === 'admin' && !user.banned && role !== 'admin' && (await countActiveAdmins(id)) === 0) {
      throw Errors.badRequest('Cannot demote the last active admin');
    }
    await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
    return { ok: true };
  });

  app.patch('/admin/users/:id/ban', { onRequest: [requirePermission('user:ban')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const { banned, reason } = parseBody(banSchema, req);
    // 保护：禁止封禁最后一个可用管理员
    const [user] = await db.select({ role: schema.users.role, banned: schema.users.banned }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (banned && user?.role === 'admin' && !user.banned && (await countActiveAdmins(id)) === 0) {
      throw Errors.badRequest('Cannot ban the last active admin');
    }
    await db
      .update(schema.users)
      .set({ banned, banReason: banned ? (reason ?? null) : null })
      .where(eq(schema.users.id, id));
    return { ok: true };
  });

  // 删除用户（会话/账号/点赞等外键按各自约束级联；作者本人不能删）
  app.delete('/admin/users/:id', { onRequest: [requirePermission('user:delete')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    if (id === req.auth!.userId) throw Errors.badRequest('Cannot delete your own account');
    const [user] = await db.select({ role: schema.users.role, banned: schema.users.banned }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!user) throw Errors.notFound('User not found');
    // 保护：禁止删除最后一个可用管理员
    if (user.role === 'admin' && !user.banned && (await countActiveAdmins(id)) === 0) {
      throw Errors.badRequest('Cannot delete the last active admin');
    }
    // 先删依赖表，再删用户（session/account 有 cascade，likes 无外键到 user 故不受影响）
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    await db.delete(schema.accounts).where(eq(schema.accounts.userId, id));
    await db.delete(schema.users).where(eq(schema.users.id, id));
    return { ok: true };
  });

  // ---- 角色管理 ----
  app.get('/admin/roles', { onRequest: [requirePermission('role:read')] }, async () => rolesWithPermissions());

  app.post('/admin/roles', { onRequest: [requirePermission('role:manage')] }, async (req) => {
    const input = parseBody(roleCreateSchema, req);
    const [created] = await db
      .insert(schema.roles)
      .values({ id: crypto.randomUUID(), code: input.code, name: input.name, description: input.description, system: 0 })
      .returning();
    if (input.permissionIds.length) {
      await db
        .insert(schema.rolePermissions)
        .values(input.permissionIds.map((permissionId) => ({ roleId: created!.id, permissionId })))
        .onConflictDoNothing();
    }
    return { ok: true, id: created!.id };
  });

  app.patch('/admin/roles/:id', { onRequest: [requirePermission('role:manage')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const input = parseBody(roleUpdateSchema, req);
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    if (!role) throw Errors.notFound('Role not found');
    if (role.system === 1) throw Errors.badRequest('Built-in roles cannot be modified');
    if (input.name !== undefined || input.description !== undefined) {
      await db
        .update(schema.roles)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        })
        .where(eq(schema.roles.id, id));
    }
    if (input.permissionIds !== undefined) {
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));
      if (input.permissionIds.length) {
        await db
          .insert(schema.rolePermissions)
          .values(input.permissionIds.map((permissionId) => ({ roleId: id, permissionId })))
          .onConflictDoNothing();
      }
    }
    return { ok: true };
  });

  app.delete('/admin/roles/:id', { onRequest: [requirePermission('role:manage')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    if (!role) throw Errors.notFound('Role not found');
    if (role.system === 1) throw Errors.badRequest('Built-in roles cannot be deleted');
    // 还有用户使用该角色时禁止删除
    const users = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, role.code)).limit(1);
    if (users.length) throw Errors.badRequest('Role is still assigned to users');
    await db.delete(schema.roles).where(eq(schema.roles.id, id));
    return { ok: true };
  });

  app.put('/admin/roles/:id/permissions', { onRequest: [requirePermission('role:manage')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const { permissionIds } = parseBody(rolePermSchema, req);
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.id, id)).limit(1);
    if (!role) throw Errors.notFound('Role not found');
    if (role.system === 1) throw Errors.badRequest('Built-in roles cannot be modified');
    await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, id));
    if (permissionIds.length) {
      await db
        .insert(schema.rolePermissions)
        .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })))
        .onConflictDoNothing();
    }
    return { ok: true };
  });

  // ---- 权限管理（CRUD）----
  app.get('/admin/permissions', { onRequest: [requirePermission('permission:read')] }, async () => {
    return db.select().from(schema.permissions).orderBy(schema.permissions.group, schema.permissions.code);
  });

  const permissionSchema = z.object({
    code: z.string().min(1).max(100).regex(/^[a-z0-9:_-]+$/, '权限码只能含小写字母、数字、冒号、下划线和连字符'),
    name: z.string().min(1).max(50),
    description: z.string().max(200).default(''),
    group: z.string().min(1).max(50).default('general'),
  });

  app.post('/admin/permissions', { onRequest: [requirePermission('permission:manage')] }, async (req) => {
    const input = parseBody(permissionSchema, req);
    await db.insert(schema.permissions).values({ id: crypto.randomUUID(), ...input, system: 0 });
    return { ok: true };
  });

  app.patch('/admin/permissions/:id', { onRequest: [requirePermission('permission:manage')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const input = parseBody(permissionSchema.partial(), req);
    const [perm] = await db.select().from(schema.permissions).where(eq(schema.permissions.id, id)).limit(1);
    if (!perm) throw Errors.notFound('Permission not found');
    if (perm.system === 1 && input.code !== undefined && input.code !== perm.code) {
      throw Errors.badRequest('Built-in permission code cannot be changed');
    }
    await db.update(schema.permissions).set(input).where(eq(schema.permissions.id, id));
    return { ok: true };
  });

  app.delete('/admin/permissions/:id', { onRequest: [requirePermission('permission:manage')] }, async (req) => {
    const { id } = parseParams(idParam, req);
    const [perm] = await db.select().from(schema.permissions).where(eq(schema.permissions.id, id)).limit(1);
    if (!perm) throw Errors.notFound('Permission not found');
    if (perm.system === 1) throw Errors.badRequest('Built-in permissions cannot be deleted');
    // role_permissions 有级联删除，删权限会自动清掉角色关联
    await db.delete(schema.permissions).where(eq(schema.permissions.id, id));
    return { ok: true };
  });
}
