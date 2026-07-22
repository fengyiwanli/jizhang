/**
 * Zustand Store - 交易状态管理
 *
 * 管理交易列表和当前编辑状态
 */
import { create } from 'zustand';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@/domain/entities/Transaction';
import type { UUID } from '@/core/types';
import { getTransactionRepository } from '@/data/repositories/TransactionRepository';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

interface TransactionState {
  /** 交易列表 */
  transactions: Transaction[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 加载交易列表 */
  loadTransactions: (limit?: number) => Promise<void>;
  /** 创建交易 */
  createTransaction: (input: Omit<CreateTransactionInput, 'ledgerId'>) => Promise<Transaction>;
  /** 更新交易 */
  updateTransaction: (id: UUID, input: UpdateTransactionInput) => Promise<void>;
  /** 删除交易 */
  deleteTransaction: (id: UUID) => Promise<void>;
  /** 获取单笔交易 */
  getTransaction: (id: UUID) => Transaction | undefined;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  loadTransactions: async (limit = 50) => {
    set({ loading: true, error: null });
    try {
      const repo = getTransactionRepository();
      const transactions = await repo.list({
        ledgerId: DEFAULT_LEDGER_ID,
        limit,
      });
      set({ transactions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createTransaction: async (input) => {
    const repo = getTransactionRepository();
    const tx = await repo.create({
      ...input,
      ledgerId: DEFAULT_LEDGER_ID,
    });
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));
    return tx;
  },

  updateTransaction: async (id, input) => {
    const repo = getTransactionRepository();
    const updated = await repo.update(id, input);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTransaction: async (id) => {
    const repo = getTransactionRepository();
    await repo.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getTransaction: (id) => {
    return get().transactions.find((t) => t.id === id);
  },
}));
