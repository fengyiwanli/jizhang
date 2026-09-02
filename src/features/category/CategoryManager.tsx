/**
 * 分类管理组件 — 列表 + 新增/编辑表单
 */
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useCategoryStore } from '@/features/category/store';
import { getAppContext } from '@/data/init';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import { useToast } from '@/shared/hooks/useToast';
import type { Category, CategoryType } from '@/domain/entities/Category';

const EMOJI_PRESETS = ['🍜', '☕', '🛒', '🚗', '🎬', '🏠', '👔', '💊', '📱', '🎁', '✈️', '📚', '🐱', '💪', '🎮', '💼'];
const COLOR_PRESETS = ['#E07B6C', '#FF9F43', '#FECA57', '#5FBB97', '#54A0FF', '#5F27CD', '#FF6FB5', '#00D2D3'];

export default function CategoryManager() {
  const { categories, loadCategories } = useCategoryStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [defaultType, setDefaultType] = useState<CategoryType>('expense');

  useEffect(() => { loadCategories(); }, []);

  const expenseCats = categories.filter((c) => c.type === 'expense' && !c.parentId);
  const incomeCats = categories.filter((c) => c.type === 'income' && !c.parentId);

  function handleAdd(type: CategoryType) {
    setEditingCat(null);
    setDefaultType(type);
    setShowForm(true);
  }

  function handleEdit(cat: Category) {
    setEditingCat(cat);
    setShowForm(true);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>分类管理</h3>
      </div>

      {/* 支出分类 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-expense)' }}>💸 支出分类</span>
          <button className="btn-pill" onClick={() => handleAdd('expense')}>+ 添加</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {expenseCats.map((c) => (
            <CatChip key={c.id} cat={c} onClick={() => handleEdit(c)} />
          ))}
        </div>
      </div>

      {/* 收入分类 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-income)' }}>💰 收入分类</span>
          <button className="btn-pill" onClick={() => handleAdd('income')}>+ 添加</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {incomeCats.map((c) => (
            <CatChip key={c.id} cat={c} onClick={() => handleEdit(c)} />
          ))}
        </div>
      </div>

      {showForm && (
        <CategoryForm
          category={editingCat}
          defaultType={defaultType}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadCategories(); }}
        />
      )}
    </div>
  );
}

function CatChip({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const IconComp = getCategoryIcon(cat.name) ?? Zap;
  const color = cat.color || getCategoryColor(cat.name);
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '8px 2px', border: 'none', borderRadius: 10, background: 'var(--color-bg-secondary)',
      cursor: 'pointer', fontFamily: 'inherit', transition: 'background 150ms',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--color-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp size={16} strokeWidth={1.8} color={color} />
      </div>
      <span style={{ fontSize: 10, color: color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
    </button>
  );
}

function CategoryForm({ category, defaultType, onClose, onSaved }: {
  category: Category | null;
  defaultType: CategoryType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? defaultType);
  const [icon, setIcon] = useState(category?.icon ?? '📦');
  const [color, setColor] = useState(category?.color ?? '#E07B6C');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { categoryRepo } = getAppContext();
    try {
      if (category) {
        await categoryRepo.update(category.id, { name: name.trim(), icon, color, parentId: category.parentId ?? undefined });
      } else {
        await categoryRepo.create({ ledgerId: '', name: name.trim(), type, icon, color });
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
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: 'var(--color-text-primary)', margin: 0 }}>
            {category ? '编辑分类' : '添加分类'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 20, width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 类型 (仅新建时) */}
        {!category && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>类型</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setType('expense')} style={{
                padding: '8px 16px', border: type === 'expense' ? '2px solid var(--color-expense)' : '1px solid var(--color-border)',
                borderRadius: 10, background: type === 'expense' ? '#FFF5F5' : 'var(--color-card)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                color: type === 'expense' ? 'var(--color-expense)' : 'var(--color-text-secondary)',
              }}>💸 支出</button>
              <button onClick={() => setType('income')} style={{
                padding: '8px 16px', border: type === 'income' ? '2px solid var(--color-income)' : '1px solid var(--color-border)',
                borderRadius: 10, background: type === 'income' ? '#F0FFF5' : 'var(--color-card)',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                color: type === 'income' ? 'var(--color-income)' : 'var(--color-text-secondary)',
              }}>💰 收入</button>
            </div>
          </div>
        )}

        {/* 名称 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>分类名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：交通、购物" style={fieldStyle} />
        </div>

        {/* 图标 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>图标</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {EMOJI_PRESETS.map((em) => (
              <button key={em} onClick={() => setIcon(em)} style={{
                width: 36, height: 36, border: icon === em ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 8, background: icon === em ? 'var(--color-primary-light)' : 'var(--color-card)',
                fontSize: 18, cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {em}
              </button>
            ))}
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="自定义" style={{ width: 50, border: '1px solid var(--color-border)', borderRadius: 8, textAlign: 'center', fontSize: 14, outline: 'none' }} />
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
