/**
 * 数据备份与恢复 — 完整 JSON 备份（账户 + 分类 + 交易 + 周期账单）
 */
import { useRef, useState } from 'react';
import { getAppContext } from '@/data/init';
import { persistDatabase } from '@/data/database/context';
import type { DatabaseAdapter } from '@/data/database/DatabaseAdapter';

/** camelCase → snake_case */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function toSnakeRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

/** 校验字段名，防止非法 SQL */
function isSafeColumn(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

async function insertRows(db: DatabaseAdapter, table: string, rows: Record<string, unknown>[]): Promise<void> {
  for (const row of rows) {
    const snake = toSnakeRow(row);
    const keys = Object.keys(snake).filter(isSafeColumn);
    if (keys.length === 0) continue;
    const placeholders = keys.map(() => '?').join(', ');
    await db.execute(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      keys.map((k) => snake[k]),
    );
  }
}

export default function DataBackup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function exportBackup() {
    setBusy(true);
    setMsg(null);
    try {
      const { db } = getAppContext();
      const accounts = await db.query('SELECT * FROM accounts WHERE deleted_at IS NULL');
      const categories = await db.query('SELECT * FROM categories WHERE deleted_at IS NULL');
      const transactions = await db.query('SELECT * FROM transactions WHERE deleted_at IS NULL');
      const recurring = await db.query('SELECT * FROM recurring_rules WHERE deleted_at IS NULL');

      const data = {
        app: '小账本',
        version: 1,
        exportTime: new Date().toISOString(),
        accounts,
        categories,
        transactions,
        recurring,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `小账本备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: 'ok', text: `已导出 ${transactions.length} 笔交易` });
    } catch {
      setMsg({ type: 'err', text: '导出失败' });
    }
    setBusy(false);
  }

  async function importBackup(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.accounts || !data.categories || !data.transactions) {
        throw new Error('无效的备份文件');
      }

      const { db } = getAppContext();
      await db.transaction(async () => {
        // 清空（注意顺序：先删引用表，再删被引用表）
        await db.execute('DELETE FROM transactions');
        await db.execute('DELETE FROM recurring_rules');
        await db.execute('DELETE FROM accounts');
        await db.execute('DELETE FROM categories');
        // 导入
        await insertRows(db, 'accounts', data.accounts);
        await insertRows(db, 'categories', data.categories);
        await insertRows(db, 'transactions', data.transactions);
        await insertRows(db, 'recurring_rules', data.recurring ?? []);
      });

      persistDatabase();
      setMsg({ type: 'ok', text: `恢复成功，共 ${data.transactions.length} 笔交易，即将重启...` });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setMsg({ type: 'err', text: `导入失败：${(e as Error).message}` });
    }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#8E8E93', lineHeight: 1.6, marginBottom: 12 }}>
        完整备份所有账单、账户、分类和固定收支，可随时恢复。换手机或重装后导入即可还原。
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={exportBackup} disabled={busy} style={primaryBtn}>
          📤 导出备份
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} style={secondaryBtn}>
          📥 导入备份
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (window.confirm('导入将覆盖当前所有数据，确认继续？')) {
              importBackup(f);
            }
          }
          e.target.value = '';
        }}
      />

      {msg && (
        <p style={{
          fontSize: 12, marginTop: 8, marginBottom: 0,
          color: msg.type === 'ok' ? '#2ECC71' : '#E07B6C',
        }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '11px 0', border: 'none', borderRadius: 10,
  background: '#4ECDC4', color: '#FFF', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: '11px 0', border: '1px solid #E0E0E0', borderRadius: 10,
  background: '#FFF', color: '#1A1A2E', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
};
