/**
 * Account Repository
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import type { Account, CreateAccountInput } from '@/domain/entities/Account';
import type { AccountType } from '@/core/types';
import type { UUID } from '@/core/types';
import { generateUUID } from '@/core/uuid';
import { nowUTC, MoneyUtils } from '@/core';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

export class AccountRepository {
  constructor(private db: DatabaseAdapter) {}

  async getById(id: UUID): Promise<Account | null> {
    const rows = await this.db.query<Account>(
      'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows[0] ?? null;
  }

  /** 获取所有非隐藏账户 */
  async listAll(ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<Account[]> {
    return this.db.query<Account>(
      'SELECT * FROM accounts WHERE ledger_id = ? AND is_hidden = 0 AND deleted_at IS NULL ORDER BY sort_order, name',
      [ledgerId],
    );
  }

  /** 按类型获取 */
  async listByType(type: AccountType, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<Account[]> {
    return this.db.query<Account>(
      'SELECT * FROM accounts WHERE ledger_id = ? AND type = ? AND deleted_at IS NULL ORDER BY sort_order',
      [ledgerId, type],
    );
  }

  /** 创建账户 */
  async create(input: CreateAccountInput): Promise<Account> {
    const id = generateUUID();
    const now = nowUTC();

    const initialBalance = input.initialBalanceInYuan
      ? MoneyUtils.fromYuan(input.initialBalanceInYuan)
      : 0;
    const creditLimit = input.creditLimitInYuan
      ? MoneyUtils.fromYuan(input.creditLimitInYuan)
      : null;

    await this.db.execute(
      `INSERT INTO accounts
       (id, ledger_id, name, type, currency, initial_balance, credit_limit, billing_day, due_day, icon, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.ledgerId || DEFAULT_LEDGER_ID,
        input.name,
        input.type,
        input.currency ?? 'CNY',
        initialBalance,
        creditLimit,
        input.billingDay ?? null,
        input.dueDay ?? null,
        input.icon ?? null,
        input.sortOrder ?? 99,
        now,
        now,
      ],
    );

    const acc = await this.getById(id);
    if (!acc) throw new Error('Failed to create account');
    return acc;
  }

  /** 更新账户 */
  async update(id: UUID, input: Partial<CreateAccountInput>): Promise<void> {
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [nowUTC()];

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type); }
    if (input.icon !== undefined) { sets.push('icon = ?'); params.push(input.icon); }
    if (input.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(input.sortOrder); }
    if (input.initialBalanceInYuan !== undefined) {
      sets.push('initial_balance = ?');
      params.push(MoneyUtils.fromYuan(input.initialBalanceInYuan));
    }
    if (input.creditLimitInYuan != null) {
      sets.push('credit_limit = ?');
      params.push(MoneyUtils.fromYuan(input.creditLimitInYuan));
    }

    params.push(id);
    await this.db.execute(
      `UPDATE accounts SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  /** 软删除 */
  async delete(id: UUID): Promise<void> {
    const now = nowUTC();
    await this.db.execute(
      'UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [now, now, id],
    );
  }

  async clearAll(): Promise<void> {
    await this.db.execute('DELETE FROM accounts');
  }

  /** 获取账户余额 (基于交易聚合) */
  async getBalance(accountId: UUID, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<number> {
    // 收入 + 转入 - 支出 - 转出
    const rows = await this.db.query<{ balance: number }>(
      `SELECT
        COALESCE(SUM(CASE
          WHEN type = 'income' THEN amount
          WHEN type = 'transfer' AND to_account_id = ? THEN amount
          ELSE 0
        END), 0)
        -
        COALESCE(SUM(CASE
          WHEN type = 'expense' AND account_id = ? THEN amount
          WHEN type = 'transfer' AND account_id = ? THEN amount
          ELSE 0
        END), 0) as balance
      FROM transactions
      WHERE deleted_at IS NULL AND ledger_id = ?`,
      [accountId, accountId, accountId, ledgerId],
    );
    return rows[0]?.balance ?? 0;
  }
}
