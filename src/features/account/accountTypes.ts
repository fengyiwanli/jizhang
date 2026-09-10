/**
 * 账户类型元数据（N-5：列表与表单共用）
 */
import { Banknote, Building2, CreditCard, Smartphone, type LucideIcon } from 'lucide-react';
import type { AccountType } from '@/core/types';

export const accountTypes: { value: AccountType; label: string; icon: LucideIcon }[] = [
  { value: 'cash', label: '现金', icon: Banknote },
  { value: 'bank', label: '银行卡', icon: Building2 },
  { value: 'credit', label: '信用卡', icon: CreditCard },
  { value: 'e-wallet', label: '电子钱包', icon: Smartphone },
];
