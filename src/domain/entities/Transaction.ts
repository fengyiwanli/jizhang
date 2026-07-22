/**
 * Transaction 实体
 *
 * 核心聚合根，遵循文档第 4.2 节 transactions 表结构
 */
import type { UUID, Money, UTCDateTime, TransactionType, SyncStatus } from '@/core/types';

export interface Transaction {
  /** UUID v7 主键 (时间有序) */
  id: UUID;
  /** 所属账本 */
  ledgerId: UUID;
  /** 交易类型: income | expense | transfer */
  type: TransactionType;
  /** 金额 (整数，单位: 分) */
  amount: Money;
  /** 源账户 */
  accountId: UUID;
  /** 目标账户 (仅 transfer) */
  toAccountId: UUID | null;
  /** 分类 (transfer 时为 null) */
  categoryId: UUID | null;
  /** 交易日期 (UTC ISO 8601 date) */
  date: string;
  /** 交易时间 (HH:mm:ss) */
  time: string;
  /** 备注 */
  note: string;
  /** 标签 (JSON array string) */
  tags: string;
  /** 消费地点 (可选) */
  location: string | null;
  /** 周期账单来源 (可选) */
  recurringId: UUID | null;
  /** 创建时间 (UTC ISO 8601) */
  createdAt: UTCDateTime;
  /** 更新时间 (UTC ISO 8601) */
  updatedAt: UTCDateTime;
  /** 软删除时间 (UTC ISO 8601, null = 未删除) */
  deletedAt: UTCDateTime | null;
  /** 同步状态: pending | synced | conflict */
  syncStatus: SyncStatus;
  /** 幂等键 (防重复提交) */
  clientId: UUID;
  /** 乐观锁版本号 */
  version: number;
}

/** 创建交易的输入 (不含自动生成字段) */
export interface CreateTransactionInput {
  ledgerId: UUID;
  type: TransactionType;
  /** 金额 (元，创建时可用小数) */
  amountInYuan: number;
  accountId: UUID;
  toAccountId?: UUID | null;
  categoryId?: UUID | null;
  date?: string;
  time?: string;
  note?: string;
  tags?: string[];
  location?: string | null;
  recurringId?: UUID | null;
}

/** 更新交易的输入 */
export interface UpdateTransactionInput {
  type?: TransactionType;
  /** 金额 (元) */
  amountInYuan?: number;
  accountId?: UUID;
  toAccountId?: UUID | null;
  categoryId?: UUID | null;
  date?: string;
  time?: string;
  note?: string;
  tags?: string[];
  location?: string | null;
}
