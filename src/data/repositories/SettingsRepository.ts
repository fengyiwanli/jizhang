/**
 * 设置 Repository — 用户偏好 key-value 存储
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import { persistDatabase } from '../database/context';
import { nowUTC } from '@/core/datetime';

export class SettingsRepository {
  constructor(private db: DatabaseAdapter) {}

  async get(key: string): Promise<string | null> {
    const rows = await this.db.query<{ value: string | null }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.db.query<{ key: string }>(
      'SELECT key FROM settings WHERE key = ?',
      [key],
    );
    if (existing[0]) {
      await this.db.execute(
        'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
        [value, nowUTC(), key],
      );
    } else {
      await this.db.execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, nowUTC()],
      );
    }
    persistDatabase();
  }

  async remove(key: string): Promise<void> {
    await this.db.execute('DELETE FROM settings WHERE key = ?', [key]);
    persistDatabase();
  }

  async clearAll(): Promise<void> {
    await this.db.execute('DELETE FROM settings');
  }
}
