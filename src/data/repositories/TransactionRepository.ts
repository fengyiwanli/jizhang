/**
 * Transaction Repository 实现
 *
 * 使用 SqlJsAdapter 进行 SQLite CRUD 操作
 * 严格遵循文档约束条件:
 * - 金额 INTEGER (分)
 * - 时间 UTC
 * - UUID v7
 * - 软删除 (deleted_at)
 * - 乐观锁 (version)
 * - 幂等键 (client_id)
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import type { ITransactionRepository, TransactionFilter } from '@/domain/repositories/ITransactionRepository';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '@/domain/entities/Transaction';
import type { UUID } from '@/core/types';
import { generateUUID, generateClientId } from '@/core/uuid';
import { nowUTC, todayUTC, nowTimeUTC } from '@/core/datetime';
import { MoneyUtils } from '@/core/types';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

export class TransactionRepository implements ITransactionRepository {
  constructor(private db: DatabaseAdapter) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const id = generateUUID();
    const now = nowUTC();
    const amount = Math.round(input.amountInYuan * 100); // 元 → 分
    const tags = JSON.stringify(input.tags ?? []);
    const ledgerId = input.ledgerId || DEFAULT_LEDGER_ID;

    await this.db.execute(
      `INSERT INTO transactions (
        id, ledger_id, type, amount, account_id, to_account_id, category_id,
        date, time, note, tags, location, recurring_id,
        created_at, updated_at, sync_status, client_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 1)`,
      [
        id,
        ledgerId,
        input.type,
        amount,
        input.accountId,
        input.toAccountId ?? null,
        input.categoryId ?? null,
        input.date ?? todayUTC(),
        input.time ?? nowTimeUTC(),
        input.note ?? '',
        tags,
        input.location ?? null,
        input.recurringId ?? null,
        now,
        now,
        generateClientId(),
      ],
    );

    const tx = await this.getById(id);
    if (!tx) throw new Error('Failed to create transaction');
    return tx;
  }

  async getById(id: UUID): Promise<Transaction | null> {
    const rows = await this.db.query<Transaction>(
      'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows[0] ?? null;
  }

  async update(id: UUID, input: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Transaction not found: ${id}`);

    const now = nowUTC();
    const sets: string[] = ['updated_at = ?', 'version = version + 1'];
    const params: unknown[] = [now];

    if (input.type !== undefined) {
      sets.push('type = ?');
      params.push(input.type);
    }
    if (input.amountInYuan !== undefined) {
      sets.push('amount = ?');
      params.push(Math.round(input.amountInYuan * 100));
    }
    if (input.accountId !== undefined) {
      sets.push('account_id = ?');
      params.push(input.accountId);
    }
    if (input.toAccountId !== undefined) {
      sets.push('to_account_id = ?');
      params.push(input.toAccountId);
    }
    if (input.categoryId !== undefined) {
      sets.push('category_id = ?');
      params.push(input.categoryId);
    }
    if (input.date !== undefined) {
      sets.push('date = ?');
      params.push(input.date);
    }
    if (input.time !== undefined) {
      sets.push('time = ?');
      params.push(input.time);
    }
    if (input.note !== undefined) {
      sets.push('note = ?');
      params.push(input.note);
    }
    if (input.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(input.tags));
    }
    if (input.location !== undefined) {
      sets.push('location = ?');
      params.push(input.location);
    }

    params.push(id);
    await this.db.execute(
      `UPDATE transactions SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Transaction not found after update: ${id}`);
    return updated;
  }

  async delete(id: UUID): Promise<void> {
    const now = nowUTC();
    // 软删除
    await this.db.execute(
      'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [now, now, id],
    );
  }

  /** 清除所有交易（调试用） */
  async clearAll(): Promise<void> {
    await this.db.execute('DELETE FROM transactions');
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const { clauses, params } = this.buildFilterClauses(filter);

    let sql = 'SELECT * FROM transactions WHERE deleted_at IS NULL';
    if (clauses.length > 0) {
      sql += ' AND ' + clauses.join(' AND ');
    }
    sql += ' ORDER BY date DESC, time DESC';

    if (filter.limit !== undefined) {
      sql += ` LIMIT ${filter.limit}`;
    }
    if (filter.offset !== undefined) {
      sql += ` OFFSET ${filter.offset}`;
    }

    return this.db.query<Transaction>(sql, params);
  }

  async count(filter: TransactionFilter): Promise<number> {
    const { clauses, params } = this.buildFilterClauses(filter);

    let sql = 'SELECT COUNT(*) as cnt FROM transactions WHERE deleted_at IS NULL';
    if (clauses.length > 0) {
      sql += ' AND ' + clauses.join(' AND ');
    }

    const rows = await this.db.query<{ cnt: number }>(sql, params);
    return rows[0]?.cnt ?? 0;
  }

  // --- 工具方法 ---

  private buildFilterClauses(filter: TransactionFilter): {
    clauses: string[];
    params: unknown[];
  } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filter.ledgerId) {
      clauses.push('ledger_id = ?');
      params.push(filter.ledgerId);
    }
    if (filter.type) {
      clauses.push('type = ?');
      params.push(filter.type);
    }
    if (filter.accountId) {
      clauses.push('account_id = ?');
      params.push(filter.accountId);
    }
    if (filter.categoryId) {
      clauses.push('category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.dateFrom) {
      clauses.push('date >= ?');
      params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      clauses.push('date <= ?');
      params.push(filter.dateTo);
    }
    // 关键字搜索: 匹配备注、标签 JSON、或分类名称
    if (filter.keyword) {
      clauses.push('(note LIKE ? OR tags LIKE ? OR category_id IN (SELECT id FROM categories WHERE name LIKE ?))');
      const kw = `%${filter.keyword}%`;
      params.push(kw, kw, kw);
    }
    // 标签筛选: 匹配 tags JSON array 中的任意值
    if (filter.tags && filter.tags.length > 0) {
      const tagClauses = filter.tags.map(() => 'tags LIKE ?');
      clauses.push(`(${tagClauses.join(' OR ')})`);
      for (const tag of filter.tags) {
        params.push(`%"${tag}"%`);
      }
    }

    return { clauses, params };
  }
}

// --- 便捷工厂 ---

let repoInstance: TransactionRepository | null = null;

export function createTransactionRepository(db: DatabaseAdapter): TransactionRepository {
  if (!repoInstance) {
    repoInstance = new TransactionRepository(db);
  }
  return repoInstance;
}

export function getTransactionRepository(): TransactionRepository {
  if (!repoInstance) throw new Error('TransactionRepository not initialized');
  return repoInstance;
}

/** 格式化 Transaction 用于显示 */
export function formatTransaction(tx: Transaction): {
  amountDisplay: string;
  typeLabel: string;
  dateDisplay: string;
  tagsList: string[];
} {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(tx.tags);
  } catch { /* ignore */ }

  const typeLabels: Record<string, string> = {
    income: '收入',
    expense: '支出',
    transfer: '转账',
  };

  return {
    amountDisplay: MoneyUtils.format(tx.amount),
    typeLabel: typeLabels[tx.type] ?? tx.type,
    dateDisplay: tx.date,
    tagsList: parsedTags,
  };
}
