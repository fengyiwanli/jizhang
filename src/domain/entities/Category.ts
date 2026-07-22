/**
 * Category 实体
 *
 * 遵循文档第 4.2 节 categories 表结构
 * 支持二级分类树 (parentId)
 */
import type { UUID, UTCDateTime } from '@/core/types';

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: UUID;
  ledgerId: UUID;
  /** 父分类 (二级分类) */
  parentId: UUID | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  /** 系统预设不可删 */
  isSystem: number;
  createdAt: UTCDateTime;
  updatedAt: UTCDateTime;
  deletedAt: UTCDateTime | null;
}

export interface CreateCategoryInput {
  ledgerId: UUID;
  parentId?: UUID | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  isSystem?: number;
}
