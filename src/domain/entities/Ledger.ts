/**
 * Ledger (账本) 实体
 *
 * 约束 13.2 第8条: 所有数据归属于某个 ledger_id
 */
import type { UUID, UTCDateTime } from '@/core/types';

export interface Ledger {
  id: UUID;
  name: string;
  description: string;
  /** 账本类型: personal | family | project | business */
  type: string;
  /** 默认货币 */
  currency: string;
  createdAt: UTCDateTime;
  updatedAt: UTCDateTime;
  deletedAt: UTCDateTime | null;
}

/** 预设默认账本 ID (用于 MVP 单账本场景) */
export const DEFAULT_LEDGER_ID = '00000000-0000-7000-8000-000000000001' as UUID;

export const DEFAULT_LEDGER: Omit<Ledger, 'createdAt' | 'updatedAt' | 'deletedAt'> = {
  id: DEFAULT_LEDGER_ID,
  name: '我的账本',
  description: '默认个人账本',
  type: 'personal',
  currency: 'CNY',
};
