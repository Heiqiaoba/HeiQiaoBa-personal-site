/**
 * 作者账号初始化脚本：在关闭公开注册后，用命令行创建唯一的 admin 账号。
 *
 * 用法：pnpm create-admin <email> <name> <password>
 *
 * 直接写 user + account 两张表（Better Auth 的邮箱密码凭证存于 account.password，
 * 用 better-auth/crypto 的 hashPassword 生成，与登录校验完全兼容）。
 * 幂等：邮箱已存在时只把角色提升为 admin 并更新密码，不重复建号。
 */
import 'dotenv/config';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { accounts, users } from './schema.js';

function makeId() {
  return crypto.randomUUID();
}

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('用法: pnpm create-admin <email> <name> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('密码长度至少 8 位');
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  let userId: string;
  if (existing.length) {
    userId = existing[0]!.id;
    await db
      .update(users)
      .set({ name, role: 'admin', banned: false, banReason: null, banExpires: null })
      .where(eq(users.id, userId));
    const cred = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);
    if (cred.length) {
      await db
        .update(accounts)
        .set({ accountId: userId, password: hashed })
        .where(eq(accounts.id, cred[0]!.id));
    } else {
      await db.insert(accounts).values({
        id: makeId(),
        userId,
        // Better Auth 约定：credential 账号的 accountId 必须等于 user.id，
        // 登录时用它匹配用户，写成邮箱会导致 "Invalid email or password"。
        accountId: userId,
        providerId: 'credential',
        password: hashed,
      });
    }
    console.log(`已更新作者账号: ${email} (role=admin)`);
  } else {
    userId = makeId();
    const now = new Date();
    await db.insert(users).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: 'admin',
      banned: false,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(accounts).values({
      id: makeId(),
      userId,
      // credential 账号的 accountId 必须是 user.id（见上方说明）
      accountId: userId,
      providerId: 'credential',
      password: hashed,
    });
    console.log(`已创建作者账号: ${email} (role=admin)`);
  }

  console.log(`ADMIN_USER_ID=${userId}  （建议把它配到 .env 的 ADMIN_USER_IDS，双保险）`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
