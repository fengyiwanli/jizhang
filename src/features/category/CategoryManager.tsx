/**
 * 分类管理组件 — 根分类 + 二级分类展示，新增/编辑表单（Lucide 图标网格）
 */
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCategoryStore } from '@/features/category/store';
import { getAppContext } from '@/data/init';
import {
  getCategoryColor, resolveCategoryIcon, ICON_CHOICES,
  getIconByKey, isLucideKey,
} from '@/shared/components/CategoryIcons';
import { useToast } from '@/shared/hooks/useToast';
import type { Category, CategoryType } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';

const COLOR_PRESETS = ['#E07B6C', '#FF9F43', '#FECA57', '#5FBB97', '#54A0FF', '#5F27CD', '#FF6FB5', '#00D2D3'];

export default function CategoryManager({ hideHeading }: { hideHeading?: boolean } = {}) {
  const { categories, loadCategories } = useCategoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [defaultType, setDefaultType] = useState<CategoryType>('expense');
  const [defaultParent, setDefaultParent] = useState<UUID | null>(null);

  useEffect(() => { loadCategories(); }, []);

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
        <CategoryForm
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

function CategoryForm({ category, defaultType, defaultParent, onClose, onSaved }: {
  category: Category | null;
  defaultType: CategoryType;
  defaultParent: UUID | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? defaultType);
  // icon 存 Lucide key（旧数据 emoji 不再是 key → 置空走名字映射，保存后统一为 key）
  const [iconKey, setIconKey] = useState<string | null>(
    category && isLucideKey(category.icon) ? category.icon : null,
  );
  const [color, setColor] = useState(category?.color ?? '#E07B6C');
  const [parentId, setParentId] = useState<UUID | null>(
    category ? category.parentId : defaultParent ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parentRoots = categories.filter((c) => !c.parentId && c.type === type);
  const PreviewIcon = iconKey
    ? getIconByKey(iconKey)
    : resolveCategoryIcon({ icon: null, name: name.trim() || (category?.name ?? '') });

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { categoryRepo } = getAppContext();
    try {
      const data = { name: name.trim(), icon: iconKey, color, parentId };
      if (category) {
        await categoryRepo.update(category.id, data);
      } else {
        await categoryRepo.create({ ledgerId: '', type, ...data });
      }
      setSaving(false);
      onSaved();
    } catch {
      setSaving(false);
      useToast.getState().error(category ? '更新分类失败' : '创建分类失败');
    }
  }

  async function handleDelete() {
    if (!category) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      const { categoryRepo } = getAppContext();
      await categoryRepo.delete(category.id);
      setSaving(false);
      onSaved();
    } catch {
      setSaving(false);
      useToast.getState().error('删除分类失败');
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 500, background: 'var(--color-card)',
        borderRadius: '20px 20px 0 0', padding: '20px 16px',
        maxHeight: '86vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: 'var(--color-text-primary)', margin: 0 }}>
            {category ? '编辑分类' : '添加分类'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 20, width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 类型 (仅新建) */}
        {!category && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>类型</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['expense', '支出'], ['income', '收入']] as const).map(([v]) => (
                <button
                  key={v}
                  onClick={() => {
                    setType(v);
                    if (!category) setParentId(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    border: type === v ? `2px solid ${v === 'expense' ? 'var(--color-expense)' : 'var(--color-income)'}` : '1px solid var(--color-border)',
                    borderRadius: 10,
                    background: type === v ? (v === 'expense' ? '#FFF5F5' : '#F0FFF5') : 'var(--color-card)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    color: type === v ? (v === 'expense' ? 'var(--color-expense)' : 'var(--color-income)') : 'var(--color-text-secondary)',
                  }}
                >
                  {v === 'expense' ? '💸 支出' : '💰 收入'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 名称 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>分类名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：夜宵、房租" style={fieldStyle} />
        </div>

        {/* 归属分类（父分类） */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>归属分类（选根分类 = 添加为二级分类）</label>
          <div style={{ position: 'relative' }}>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value || null)}
              style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">一级分类</option>
              {parentRoots.filter((r) => r.id !== category?.id).map((r) => (
                <option key={r.id} value={r.id}>↳ {r.name}（二级）</option>
              ))}
            </select>
            <ChevronDown size={14} color="var(--color-text-tertiary)" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* 图标：Lucide 网格 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ ...labelStyle, marginBottom: 6 }}>图标</label>
            <button
              onClick={() => setIconKey(null)}
              style={{
                border: '1px dashed var(--color-border)', background: 'transparent',
                color: 'var(--color-text-secondary)', fontSize: 11, borderRadius: 6,
                padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              默认（按分类名）
            </button>
          </div>
          {/* 当前选中预览 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            background: 'var(--color-bg-secondary)', borderRadius: 10, padding: '8px 10px',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {PreviewIcon ? <PreviewIcon size={22} strokeWidth={1.8} color={color} /> : null}
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {iconKey ? `选中：${iconKey}` : '不指定图标（显示跟随分类名）'}
            </span>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
            {ICON_CHOICES.map((g) => (
              <div key={g.group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 500 }}>{g.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {g.items.map((it) => {
                    const active = iconKey === it.key;
                    return (
                      <button
                        key={it.key}
                        onClick={() => setIconKey(it.key)}
                        title={it.label}
                        style={{
                          width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
                          border: 'none',
                          background: active ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
                          boxShadow: active ? `inset 0 0 0 1.5px var(--color-primary)` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {(() => {
                          const I = getIconByKey(it.key);
                          return I ? <I size={18} strokeWidth={1.8} color={active ? 'var(--color-primary)' : 'var(--color-text-secondary)'} /> : null;
                        })()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 颜色 */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>颜色</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: 14, border: color === c ? '3px solid #2C3E50' : '2px solid #FFF',
                background: c, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            ))}
          </div>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-accent"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              flex: 1,
              background: name.trim()
                ? (type === 'expense' ? 'var(--color-expense)' : 'var(--color-income)')
                : undefined,
            }}
          >
            {saving ? '保存中...' : category ? '更新' : '创建'}
          </button>
          {category && (
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={saving}
              style={confirmDelete
                ? undefined
                : { background: '#FFF3F3', color: 'var(--color-expense)', boxShadow: 'none' }}
            >
              {confirmDelete ? '确认删除？' : '删除'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, paddingLeft: 2 };
const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: 'none', borderRadius: 12, fontSize: 14, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--color-bg-secondary)' };
