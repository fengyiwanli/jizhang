/**
 * 数据库上下文管理器
 *
 * 提供单例 SqlJsAdapter，管理数据库生命周期
 * 支持从 localStorage 持久化恢复
 */
import { SqlJsAdapter } from './SqlJsAdapter';
import type { DatabaseAdapter } from './DatabaseAdapter';

const DB_STORAGE_KEY = 'bookkeeping_db_v1';

let adapter: SqlJsAdapter | null = null;

/** 获取数据库适配器单例 */
export async function getDatabase(): Promise<DatabaseAdapter> {
  if (adapter?.export()) return adapter;

  adapter = new SqlJsAdapter();

  // 尝试从 localStorage 恢复
  try {
    const saved = localStorage.getItem(DB_STORAGE_KEY);
    if (saved) {
      const buffer = base64ToArrayBuffer(saved);
      await adapter.loadFromBuffer(buffer);
      return adapter;
    }
  } catch {
    // 恢复失败，重新初始化
  }

  await adapter.initialize();
  return adapter;
}

/** 持久化数据库到 localStorage */
export function persistDatabase(): void {
  if (!adapter) return;
  const data = adapter.export();
  if (!data) return;
  try {
    const base64 = arrayBufferToBase64(data);
    localStorage.setItem(DB_STORAGE_KEY, base64);
  } catch {
    console.warn('Failed to persist database to localStorage');
  }
}

/** 关闭数据库 */
export async function closeDatabase(): Promise<void> {
  persistDatabase();
  await adapter?.close();
  adapter = null;
}

/** 重置数据库 (仅用于开发) */
export function resetDatabase(): void {
  adapter?.close();
  adapter = null;
  localStorage.removeItem(DB_STORAGE_KEY);
}

// --- 工具函数 ---

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
