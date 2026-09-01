/**
 * 分类网格 — 支持二级分类
 * 点击一级分类：有子分类则展开二级面板，无子分类则直接选中
 */
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Category } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import { Zap } from 'lucide-react';

interface CategoryGridProps {
  /** 完整分类列表（含子分类） */
  categories: Category[];
  selectedId: UUID | null;
  onSelect: (id: UUID) => void;
}

export default function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const [parentId, setParentId] = useState<UUID | null>(null);
  const rootCategories = categories.filter((c) => !c.parentId);

  // 二级分类面板
  if (parentId) {
    const parent = categories.find((c) => c.id === parentId);
    const children = categories.filter((c) => c.parentId === parentId);

    return (
      <div>
        {/* 返回栏 */}
        <button
          onClick={() => setParentId(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#1A1A2E',
            padding: '4px 4px 10px', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={16} color="#8E8E93" />
          {parent?.icon ?? ''} {parent?.name ?? '返回'}
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
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#C7C7CC', fontSize: 13, padding: 20 }}>
              暂无子分类
            </div>
          )}
        </div>
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
              background: isSelected ? `${cat.color || getCategoryColor(cat.name)}18` : '#F5F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
              position: 'relative',
            }}>
              <CategoryIcon name={cat.name} color={isSelected ? (cat.color || getCategoryColor(cat.name)) : '#8E8E93'} />
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
              color: isSelected ? (cat.color || getCategoryColor(cat.name)) : '#8E8E93',
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

function CategoryIcon({ name, color }: { name: string; color: string }) {
  const IconComp = getCategoryIcon(name) ?? Zap;
  return <IconComp size={22} strokeWidth={1.8} color={color} />;
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
        background: selected ? `${color}18` : '#F5F5F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease',
      }}>
        <CategoryIcon name={cat.name} color={selected ? color : '#8E8E93'} />
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: selected ? 600 : 400,
        color: selected ? color : '#8E8E93',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
      }}>
        {cat.name}
      </span>
    </button>
  );
}
