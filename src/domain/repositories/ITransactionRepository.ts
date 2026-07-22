/**
 * Transaction Repository 接口 (领域层抽象)
 *
 * 遵循 DDD 分层: 领域层定义接口，数据层实现
 */
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@/domain/entities/Transaction';
import type { UUID } from '@/core/types';

export interface TransactionFilter {
  ledgerId: UUID;
  type?: 'income' | 'expense' | 'transfer';
  accountId?: UUID;
  categoryId?: UUID;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ITransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  getById(id: UUID): Promise<Transaction | null>;
  update(id: UUID, input: UpdateTransactionInput): Promise<Transaction>;
  delete(id: UUID): Promise<void>;
  list(filter: TransactionFilter): Promise<Transaction[]>;
  count(filter: TransactionFilter): Promise<number>;
}
