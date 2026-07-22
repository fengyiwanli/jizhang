/**
 * 分类网格 — Lucide SVG 矢量图标 + 现代极简风格
 */
import type { Category } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import { Zap } from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
  selectedId: UUID | null;
  onSelect: (id: UUID) => void;
}

export default function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, rowGap: 8 }}>
      {rootCategories.map((cat) => {
        const IconComp = getCategoryIcon(cat.name) ?? Zap;
        const isSelected = cat.id === selectedId;
        const color = cat.color || getCategoryColor(cat.name);

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
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
              background: isSelected ? `${color}18` : '#F5F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
            }}>
              <IconComp
                size={22}
                strokeWidth={1.8}
                color={isSelected ? color : '#8E8E93'}
                style={{ transition: 'color 200ms ease' }}
              />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? color : '#8E8E93',
              transition: 'color 200ms ease',
              letterSpacing: 0.2,
            }}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
