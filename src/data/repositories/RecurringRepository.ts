/**
 * 周期账单规则 Repository
 *
 * 管理固定收支规则（每日/每周/每月/每年）
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import { persistDatabase } from '../database/context';
import type { UUID } from '@/core/types';
import { generateUUID } from '@/core/uuid';
import { nowUTC } from '@/core/datetime';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import type { Frequency, RecurringRule, CreateRecurringInput } from '@/domain/entities/Recurring';

export type { Frequency, RecurringRule, CreateRecurringInput };
export { frequencyLabel, advanceNextRun } from '@/domain/recurring';

export class RecurringRepository {
  constructor(private db: DatabaseAdapter) {}

  async list(ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<RecurringRule[]> {
    return this.db.query<RecurringRule>(
      `SELECT * FROM recurring_rules
       WHERE ledger_id = ? AND deleted_at IS NULL
       ORDER BY is_active DESC, next_run ASC`,
      [ledgerId],
    );
  }

  async create(input: CreateRecurringInput): Promise<RecurringRule> {
    const id = generateUUID();
    const now = nowUTC();
    await this.db.execute(
      `INSERT INTO recurring_rules
       (id, ledger_id, type, amount, account_id, category_id, note, frequency, interval, next_run, start_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        DEFAULT_LEDGER_ID,
        input.type,
        Math.round(input.amountInYuan * 100),
        input.accountId,
        input.categoryId ?? null,
        input.note ?? '',
        input.frequency,
        input.interval ?? 1,
        input.nextRun,
        input.nextRun,
        now,
        now,
      ],
    );
    persistDatabase();
    const rows = await this.db.query<RecurringRule>('SELECT * FROM recurring_rules WHERE id = ?', [id]);
    return rows[0]!;
  }

  async update(id: UUID, input: Partial<CreateRecurringInput>): Promise<void> {
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [nowUTC()];
    if (input.type !== undefined) { sets.push('type = ?'); params.push(input.type); }
    if (input.amountInYuan !== undefined) { sets.push('amount = ?'); params.push(Math.round(input.amountInYuan * 100)); }
    if (input.accountId !== undefined) { sets.push('account_id = ?'); params.push(input.accountId); }
    if (input.categoryId !== undefined) { sets.push('category_id = ?'); params.push(input.categoryId); }
    if (input.note !== undefined) { sets.push('note = ?'); params.push(input.note); }
    if (input.frequency !== undefined) { sets.push('frequency = ?'); params.push(input.frequency); }
    if (input.interval !== undefined) { sets.push('interval = ?'); params.push(input.interval); }
    if (input.nextRun !== undefined) { sets.push('next_run = ?'); params.push(input.nextRun); }
    params.push(id);
    await this.db.execute(
      `UPDATE recurring_rules SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
    persistDatabase();
  }

  async delete(id: UUID): Promise<void> {
    const now = nowUTC();
    await this.db.execute(
      'UPDATE recurring_rules SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id],
    );
    persistDatabase();
  }

  async toggle(id: UUID, isActive: boolean): Promise<void> {
    await this.db.execute(
      'UPDATE recurring_rules SET is_active = ?, updated_at = ? WHERE id = ?',
      [isActive ? 1 : 0, nowUTC(), id],
    );
    persistDatabase();
  }

  /** 获取到期的规则（下次执行日期 <= 今天） */
  async getDueRules(today: string): Promise<RecurringRule[]> {
    return this.db.query<RecurringRule>(
      `SELECT * FROM recurring_rules
       WHERE deleted_at IS NULL AND is_active = 1 AND next_run <= ?`,
      [today],
    );
  }

  async setNextRun(id: UUID, nextRun: string): Promise<void> {
    await this.db.execute(
      'UPDATE recurring_rules SET next_run = ?, updated_at = ? WHERE id = ?',
      [nextRun, nowUTC(), id],
    );
  }
}
