/**
 * 分类网格 — 支持二级分类
 * 点击一级分类：有子分类则展开二级面板，无子分类则直接选中
 * 二级面板操作：记到父分类 / 添加子分类（保存后刷新 store 立即出现在网格）
 */
import { useState } from 'react';
import { ChevronLeft, Plus, Package, type LucideIcon } from 'lucide-react';
import type { Category } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';
import { getCategoryColor, resolveCategoryIcon, getIconByKey, ICON_CHOICES } from './CategoryIcons';
import { BottomSheet } from './BottomSheet';
import { getAppContext } from '@/data/init';
import { useCategoryStore } from '@/features/category/store';
import { useToast } from '@/shared/hooks/useToast';

interface CategoryGridProps {
  /** 完整分类列表（含子分类） */
  categories: Category[];
  selectedId: UUID | null;
  onSelect: (id: UUID) => void;
}

export default function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const [parentId, setParentId] = useState<UUID | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const rootCategories = categories.filter((c) => !c.parentId);

  // 二级分类面板
  if (parentId) {
    const parent = categories.find((c) => c.id === parentId);
    const children = categories.filter((c) => c.parentId === parentId);
    if (!parent) { setParentId(null); return null; }

    return (
      <div>
        {/* 返回栏 */}
        <button
          onClick={() => setParentId(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
            padding: '4px 4px 10px', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={16} color="var(--color-text-secondary)" />
          <IconBox size={20} color={parent.color || getCategoryColor(parent.name)} icon={resolveCategoryIcon(parent)} />
          {parent.name}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, rowGap: 8 }}>
          {children.map((cat) => (
            <CatButton
              key={cat.id}
              cat={cat}
              selected={cat.id === selectedId}
              onSelect={() => onSelect(cat.id)}
            />
          ))}
          {children.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '12px 0' }}>
              暂无子分类
            </div>
          )}
        </div>

        {/* 快捷操作：记到父分类 / 添加子分类 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          <button
            className="row-press"
            onClick={() => onSelect(parent.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: '1px dashed var(--color-border)', borderRadius: 10,
              background: 'var(--color-card)', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
              padding: '10px 0', fontFamily: 'inherit',
            }}
          >
            <Package size={14} color="var(--color-primary)" />
            记到「{parent.name}」
          </button>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', borderRadius: 10,
              background: 'var(--color-primary-light)', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--color-primary)',
              padding: '10px 0', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} />
            添加子分类
          </button>
        </div>

        {addOpen && parent && (
          <AddChildSheet
            parent={parent}
            onClose={() => setAddOpen(false)}
          />
        )}
      </div>
    );
  }

  // 一级分类面板
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, rowGap: 8 }}>
      {rootCategories.map((cat) => {
        const hasChildren = categories.some((c) => c.parentId === cat.id);
        // 若选中的是子分类，其父分类也算选中态
        const selectedChild = categories.find((c) => c.id === selectedId);
        const isSelected = cat.id === selectedId || (selectedChild?.parentId === cat.id);

        return (
          <button
            key={cat.id}
            onClick={() => {
              if (hasChildren) setParentId(cat.id);
              else onSelect(cat.id);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '14px 4px',
              border: 'none',
              borderRadius: 14,
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            <div style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: isSelected ? `${cat.color || getCategoryColor(cat.name)}22` : 'var(--color-bg-secondary)',
              /* 选中加内描边：浅色分类（如"其他支出"）也清晰可见 */
              boxShadow: isSelected ? `inset 0 0 0 1.5px ${cat.color || getCategoryColor(cat.name)}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
              position: 'relative',
            }}>
              <IconBox
                size={24}
                color={isSelected ? (cat.color || getCategoryColor(cat.name)) : 'var(--color-text-secondary)'}
                icon={resolveCategoryIcon(cat)}
              />
              {hasChildren && (
                <span style={{
                  position: 'absolute', right: 3, bottom: 3,
                  width: 5, height: 5, borderRadius: 3, background: '#C7C7CC',
                }} />
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? (cat.color || getCategoryColor(cat.name)) : 'var(--color-text-secondary)',
              transition: 'color 200ms ease',
              letterSpacing: 0.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
            }}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 统一图标渲染小块 */
function IconBox({ icon: IconComp, size, color }: { icon: LucideIcon; size: number; color: string }) {
  return <IconComp size={size} strokeWidth={1.8} color={color} />;
}

function CatButton({ cat, selected, onSelect }: {
  cat: Category; selected: boolean; onSelect: () => void;
}) {
  const color = cat.color || getCategoryColor(cat.name);
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '14px 4px',
        border: 'none',
        borderRadius: 14,
        background: 'transparent',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 48, height: 48,
        borderRadius: 14,
        background: selected ? `${color}22` : 'var(--color-bg-secondary)',
        /* 选中加内描边 */
        boxShadow: selected ? `inset 0 0 0 1.5px ${color}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease',
      }}>
        <IconBox icon={resolveCategoryIcon(cat)} size={24} color={selected ? color : 'var(--color-text-secondary)'} />
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: selected ? 600 : 400,
        color: selected ? color : 'var(--color-text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
      }}>
        {cat.name}
      </span>
    </button>
  );
}

/** 记账时快捷添加二级分类 */
function AddChildSheet({ parent, onClose }: { parent: Category; onClose: () => void }) {
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const [name, setName] = useState('');
  const [iconKey, setIconKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const color = parent.color || getCategoryColor(parent.name);

  async function handleSave() {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    try {
      const { categoryRepo } = getAppContext();
      await categoryRepo.create({
        ledgerId: '',
        parentId: parent.id,
        name: n,
        type: parent.type,
        icon: iconKey,          // Lucide key 字符串
        color,
        sortOrder: 99,
      });
      await loadCategories();   // 刷新 store，记账网格立即出现新分类
      useToast.getState().success(`已添加「${n}」`);
      onClose();
    } catch {
      useToast.getState().error('添加分类失败');
    }
    setSaving(false);
  }

  return (
    <BottomSheet title={`添加「${parent.name}」的子分类`} onClose={onClose}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
        自动归入「{parent.name}」· 颜色沿用父分类
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="分类名称，如：夜宵"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: 10,
          fontSize: 14, outline: 'none', fontFamily: 'inherit',
          color: 'var(--color-text-primary)', background: 'var(--color-card)',
          marginBottom: 14,
        }}
      />

      {/* 图标网格 */}
      <div style={{ maxHeight: '38vh', overflowY: 'auto' }}>
        {ICON_CHOICES.map((g) => (
          <div key={g.group} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
              {g.group}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {g.items.map((it) => {
                const active = iconKey === it.key;
                return (
                  <button
                    key={it.key}
                    onClick={() => setIconKey(it.key)}
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      border: 'none', cursor: 'pointer',
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

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
        <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? '保存中...' : '保存分类'}
        </button>
      </div>
    </BottomSheet>
  );
}
