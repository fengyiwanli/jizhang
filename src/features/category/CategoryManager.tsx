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
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', margin: 0 }}>分类管理</h3>
      </div>

      {/* 支出分类 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E07B6C' }}>💸 支出分类</span>
          <button onClick={() => handleAdd('expense')} style={addBtnStyle}>+ 添加</button>
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
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5FBB97' }}>💰 收入分类</span>
          <button onClick={() => handleAdd('income')} style={addBtnStyle}>+ 添加</button>
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
      padding: '8px 2px', border: 'none', borderRadius: 10, background: '#F5F5F7',
      cursor: 'pointer', fontFamily: 'inherit', transition: 'background 150ms',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#FFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp size={16} strokeWidth={1.8} color={color} />
      </div>
      <span style={{ fontSize: 10, color: color }}>{cat.name}</span>
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
        width: '100%', maxWidth: 500, background: '#FFF',
        borderRadius: '20px 20px 0 0', padding: '20px 16px',
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: '#1A1A2E', margin: 0 }}>
            {category ? '编辑分类' : '添加分类'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: '#F0F2F5', borderRadius: 20, width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>

        {/* 类型 (仅新建时) */}
        {!category && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>类型</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setType('expense')} style={{
                padding: '8px 16px', border: type === 'expense' ? '2px solid #FF6B6B' : '1px solid #E0E0E0',
                borderRadius: 10, background: type === 'expense' ? '#FFF5F5' : '#FFF',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                color: type === 'expense' ? '#E07B6C' : '#7F8C8D',
              }}>💸 支出</button>
              <button onClick={() => setType('income')} style={{
                padding: '8px 16px', border: type === 'income' ? '2px solid #2ECC71' : '1px solid #E0E0E0',
                borderRadius: 10, background: type === 'income' ? '#F0FFF5' : '#FFF',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                color: type === 'income' ? '#5FBB97' : '#7F8C8D',
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
                width: 36, height: 36, border: icon === em ? '2px solid #4ECDC4' : '1px solid #E8E8E8',
                borderRadius: 8, background: icon === em ? '#E8FAF8' : '#FFF',
                fontSize: 18, cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {em}
              </button>
            ))}
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="自定义" style={{ width: 50, border: '1px solid #E8E8E8', borderRadius: 8, textAlign: 'center', fontSize: 14, outline: 'none' }} />
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
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{
            flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
            background: name.trim() ? (type === 'expense' ? '#E07B6C' : '#5FBB97') : '#E0E0E0',
            color: '#FFF', fontSize: 15, fontWeight: 600,
            cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}>
            {saving ? '保存中...' : category ? '更新' : '创建'}
          </button>
          {category && (
            <button onClick={handleDelete} disabled={saving} style={{
              padding: '12px 20px', border: 'none', borderRadius: 12,
              background: confirmDelete ? '#E07B6C' : '#FFF3F3',
              color: confirmDelete ? '#FFF' : '#E07B6C',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {confirmDelete ? '确认删除？' : '删除'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 4, paddingLeft: 2 };
const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: 'none', borderRadius: 12, fontSize: 14, color: '#1A1A2E', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#F5F5F7' };
const addBtnStyle: React.CSSProperties = { padding: '4px 12px', border: '1px solid #4ECDC4', borderRadius: 8, background: 'transparent', color: '#4ECDC4', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 };
