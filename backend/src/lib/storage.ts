/**
 * 存储抽象层：上传/列举/删除图片，与具体存储后端解耦。
 *
 * 当前实现：
 * - local（默认）：写 backend/uploads/，通过 /uploads/* 静态访问
 * - s3：预留接口，填入 S3 兼容服务（R2/OSS/S3）配置后启用
 *
 * 切换方式：STORAGE_DRIVER=local|s3
 */
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';

export type StoredFile = {
  name: string;
  url: string;
  size: number;
  createdAt: string;
};

export interface StorageProvider {
  put(name: string, data: Buffer, mime: string): Promise<string>;
  list(): Promise<StoredFile[]>;
  remove(name: string): Promise<void>;
}

/** ---- 本地磁盘实现 ---- */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

class LocalStorage implements StorageProvider {
  async put(name: string, data: Buffer) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), data);
    return `/uploads/${name}`;
  }

  async list(): Promise<StoredFile[]> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const names = (await readdir(UPLOAD_DIR)).filter((n) => !n.startsWith('.'));
    const files = await Promise.all(
      names.map(async (name) => {
        const fileStat = await stat(path.join(UPLOAD_DIR, name));
        return {
          name,
          url: `/uploads/${name}`,
          size: fileStat.size,
          createdAt: fileStat.mtime.toISOString(),
        };
      }),
    );
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async remove(name: string) {
    // 防路径穿越：只允许简单文件名
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error('Invalid filename');
    await unlink(path.join(UPLOAD_DIR, name));
  }
}

/** ---- S3 兼容实现（占位，待配置后启用） ---- */
class S3Storage implements StorageProvider {
  private config = {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    publicUrl: env.S3_PUBLIC_URL,
  };

  private assertConfig() {
    const c = this.config;
    if (!c.endpoint || !c.bucket || !c.accessKey || !c.secretKey || !c.publicUrl) {
      throw new Error(
        'S3 storage selected but not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_URL.',
      );
    }
  }

  async put(name: string, _data: Buffer, _mime: string): Promise<string> {
    this.assertConfig();
    // TODO: 用 @aws-sdk/client-s3 上传到 this.config.bucket
    throw new Error('S3 storage provider is not implemented yet. Use STORAGE_DRIVER=local.');
  }
  async list(): Promise<StoredFile[]> {
    this.assertConfig();
    throw new Error('S3 storage provider is not implemented yet.');
  }
  async remove(_name: string) {
    this.assertConfig();
    throw new Error('S3 storage provider is not implemented yet.');
  }
}

/** 当前生效的存储实现 */
export const storage: StorageProvider = env.STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage();
