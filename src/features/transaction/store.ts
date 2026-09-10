/**
 * Zustand Store - 交易状态管理
 *
 * 数据访问统一走 services（N-1）：
 * - 写操作由 services 自动 emit 'transactions'
 * - store 自身订阅一次该 topic，任何来源的交易变更都会刷新列表（带 200ms 去抖）
 */
import { create } from 'zustand';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@/domain/entities/Transaction';
import type { UUID } from '@/core/types';
import { services } from '@/data/services';
import { dataEvents } from '@/data/dataEvents';
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
      const transactions = await services.transactionRepo.list({
        ledgerId: DEFAULT_LEDGER_ID,
        limit,
      });
      set({ transactions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createTransaction: async (input) => {
    const tx = await services.transactionRepo.create({
      ...input,
      ledgerId: DEFAULT_LEDGER_ID,
    });
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));
    return tx;
  },

  updateTransaction: async (id, input) => {
    const updated = await services.transactionRepo.update(id, input);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTransaction: async (id) => {
    await services.transactionRepo.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getTransaction: (id) => {
    return get().transactions.find((t) => t.id === id);
  },
}));

// 模块级订阅：任何来源(任何页面/服务)的交易写入都刷新 store 列表（去抖，避免写后重复查询）
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
dataEvents.subscribe('transactions', () => {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    void useTransactionStore.getState().loadTransactions(10000);
  }, 200);
});
