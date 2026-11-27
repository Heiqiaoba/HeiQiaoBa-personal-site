/**
 * 公共权限工具测试：can() 的判定规则。
 * 覆盖：无数据、admin 恒真、guest 按权限列表匹配、未知权限拒绝。
 */
import { describe, expect, it } from 'vitest';
import { can } from './permissions';

describe('can()', () => {
  it('denies when no permission data', () => {
    expect(can(undefined, 'note:create')).toBe(false);
  });

  it('admin always has every permission', () => {
    expect(can({ role: 'admin', permissions: [] }, 'user:role')).toBe(true);
    expect(can({ role: 'admin', permissions: [] }, 'any:new:permission')).toBe(true);
  });

  it('matches permission codes for non-admin roles', () => {
    const data = { role: 'editor', permissions: ['note:read', 'note:update'] };
    expect(can(data, 'note:read')).toBe(true);
    expect(can(data, 'note:update')).toBe(true);
    expect(can(data, 'note:delete')).toBe(false);
  });

  it('guest with no permissions is denied everything', () => {
    expect(can({ role: 'guest', permissions: [] }, 'note:read')).toBe(false);
  });
});
