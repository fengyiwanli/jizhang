/**
 * 分类管理组件 — 支出/收入分类抽屉列表（表单见 CategoryFormSheet.tsx）
 */
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCategoryStore } from '@/features/category/store';
import { getCategoryColor, resolveCategoryIcon } from '@/shared/components/CategoryIcons';
import { useDataVersion } from '@/shared/hooks/useDataVersion';
import CategoryFormSheet from './CategoryFormSheet';
import type { Category, CategoryType } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';

export default function CategoryManager({ hideHeading }: { hideHeading?: boolean } = {}) {
  const { categories, loadCategories } = useCategoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [defaultType, setDefaultType] = useState<CategoryType>('expense');
  const [defaultParent, setDefaultParent] = useState<UUID | null>(null);

  const catVer = useDataVersion('categories');
  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catVer]);

  const rootsOf = (type: CategoryType) => categories.filter((c) => c.type === type && !c.parentId);

  function handleAdd(type: CategoryType, parentId: UUID | null = null) {
    setEditingCat(null);
    setDefaultType(type);
    setDefaultParent(parentId);
    setShowForm(true);
  }

  function handleEdit(cat: Category) {
    setEditingCat(cat);
    setDefaultType(cat.type);
    setDefaultParent(cat.parentId);
    setShowForm(true);
  }

  return (
    <div>
      {!hideHeading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>分类管理</h3>
        </div>
      )}

      <CatGroup
        title="支出分类"
        icon="💸"
        roots={rootsOf('expense')}
        categories={categories}
        onAddRoot={() => handleAdd('expense')}
        onAddChild={(pid) => handleAdd('expense', pid)}
        onEdit={handleEdit}
      />
      <CatGroup
        title="收入分类"
        icon="💰"
        roots={rootsOf('income')}
        categories={categories}
        onAddRoot={() => handleAdd('income')}
        onAddChild={(pid) => handleAdd('income', pid)}
        onEdit={handleEdit}
      />

      {showForm && (
        <CategoryFormSheet
          category={editingCat}
          defaultType={defaultType}
          defaultParent={defaultParent}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadCategories(); }}
        />
      )}
    </div>
  );
}

/** 分类组：支出/收入 各自一个抽屉盒，默认收起 */
function CatGroup({ title, icon, roots, categories, onAddRoot, onAddChild, onEdit }: {
  title: string; icon: string;
  roots: Category[]; categories: Category[];
  onAddRoot: () => void; onAddChild: (parentId: UUID) => void;
  onEdit: (cat: Category) => void;
}) {
  const childrenOf = (pid: UUID) => categories.filter((c) => c.parentId === pid);
  const [open, setOpen] = useState(false); // 默认收起
  const childCount = roots.reduce((n, r) => n + childrenOf(r.id).length, 0);

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 14,
      marginBottom: 12, overflow: 'hidden', background: 'var(--color-card)',
    }}>
      {/* 大标题抽屉头 */}
      <button
        onClick={() => setOpen(!open)}
        className="row-press"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', padding: '13px 14px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{icon} {title}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {roots.length} 主分类{childCount > 0 ? ` · ${childCount} 子分类` : ''}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onAddRoot(); }}
            style={{
              fontSize: 12, color: 'var(--color-primary)', fontWeight: 600,
              padding: '3px 10px', border: '1px solid var(--color-primary)', borderRadius: 9,
              cursor: 'pointer', fontFamily: 'inherit', background: 'var(--color-primary-light)',
            }}
          >
            + 添加
          </span>
          <ChevronDown
            size={16}
            color="var(--color-text-tertiary)"
            style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 6 }}>
            {roots.map((c) => <CatChip key={c.id} cat={c} onClick={() => onEdit(c)} />)}
          </div>

          {/* 二级分类 */}
          {roots.map((root) => {
            const kids = childrenOf(root.id);
            if (kids.length === 0) return null;
            return (
              <div key={root.id} style={{ margin: '8px 0 2px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4, paddingLeft: 2,
                }}>
                  <span style={{ fontWeight: 500 }}>· {root.name} 的子分类</span>
                  <button
                    onClick={() => onAddChild(root.id)}
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: 'var(--color-primary)', fontSize: 11, padding: 0, fontFamily: 'inherit',
                    }}
                  >
                    + 添加
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {kids.map((k) => (
                    <button key={k.id} onClick={() => onEdit(k)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      border: '1px solid var(--color-border)', borderRadius: 8,
                      background: 'var(--color-card)', cursor: 'pointer', fontFamily: 'inherit',
                      padding: '3px 8px', fontSize: 11, color: 'var(--color-text-primary)',
                    }}>
                      {catIconEl(k, 13)}
                      <span>{k.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CatChip({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const color = cat.color || getCategoryColor(cat.name);
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '8px 2px', border: 'none', borderRadius: 10, background: 'var(--color-bg-secondary)',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--color-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {catIconEl(cat, 16)}
      </div>
      <span style={{ fontSize: 10, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{cat.name}</span>
    </button>
  );
}

function catIconEl(cat: Category, size: number) {
  const I = resolveCategoryIcon(cat);
  return <I size={size} strokeWidth={1.8} color={cat.color || getCategoryColor(cat.name)} />;
}
