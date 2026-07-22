/**
 * 分类 Zustand Store
 */
import { create } from 'zustand';
import type { Category, CategoryType } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';
import { getAppContext } from '@/data/init';
import { useToast } from '@/shared/hooks/useToast';

interface CategoryState {
  categories: Category[];
  loading: boolean;

  loadCategories: () => Promise<void>;
  getByType: (type: CategoryType) => Category[];
  getRootByType: (type: CategoryType) => Category[];
  getChildren: (parentId: UUID) => Category[];
  getById: (id: UUID) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,

  loadCategories: async () => {
    set({ loading: true });
    try {
      const { categoryRepo } = getAppContext();
      const categories = await categoryRepo.listAll();
      set({ categories, loading: false });
    } catch {
      set({ loading: false });
      useToast.getState().error('加载分类失败');
    }
  },

  /** 按类型返回所有分类（含子分类），用于筛选 */
  getByType: (type: CategoryType) => {
    return get().categories.filter((c) => c.type === type);
  },

  /** 按类型返回根分类（不含子分类），用于选择器 */
  getRootByType: (type: CategoryType) => {
    return get().categories.filter((c) => c.type === type && !c.parentId);
  },

  getChildren: (parentId: UUID) => {
    return get().categories.filter((c) => c.parentId === parentId);
  },

  getById: (id: UUID) => {
    return get().categories.find((c) => c.id === id);
  },
}));
