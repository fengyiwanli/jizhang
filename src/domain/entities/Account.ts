/**
 * Account 实体
 *
 * 遵循文档第 4.2 节 accounts 表结构
 */
import type { UUID, Money, UTCDateTime, AccountType } from '@/core/types';

export interface Account {
  id: UUID;
  ledgerId: UUID;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: Money;
  creditLimit: Money | null;
  billingDay: number | null;
  dueDay: number | null;
  icon: string | null;
  sortOrder: number;
  isHidden: number;
  createdAt: UTCDateTime;
  updatedAt: UTCDateTime;
  deletedAt: UTCDateTime | null;
}

export interface CreateAccountInput {
  ledgerId: UUID;
  name: string;
  type: AccountType;
  currency?: string;
  initialBalanceInYuan?: number;
  creditLimitInYuan?: number | null;
  billingDay?: number | null;
  dueDay?: number | null;
  icon?: string | null;
  sortOrder?: number;
}
