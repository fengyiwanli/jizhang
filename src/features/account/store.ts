/**
 * 账户 Zustand Store
 */
import { create } from 'zustand';
import type { Account } from '@/domain/entities/Account';
import type { UUID } from '@/core/types';
import { getAppContext } from '@/data/init';
import { useToast } from '@/shared/hooks/useToast';

interface AccountState {
  accounts: Account[];
  loading: boolean;

  loadAccounts: () => Promise<void>;
  getById: (id: UUID) => Account | undefined;
  getDefault: () => Account | undefined;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  loading: false,

  loadAccounts: async () => {
    set({ loading: true });
    try {
      const { accountRepo } = getAppContext();
      const accounts = await accountRepo.listAll();
      set({ accounts, loading: false });
    } catch {
      set({ loading: false });
      useToast.getState().error('加载账户失败');
    }
  },

  getById: (id: UUID) => {
    return get().accounts.find((a) => a.id === id);
  },

  getDefault: () => {
    return get().accounts[0];
  },
}));
