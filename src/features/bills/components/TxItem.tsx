/**
 * 账单行（N-5：从 BillsPage 拆出）
 *
 * 交互：长按编辑 / 左滑删除 / 右侧小垃圾桶（两次确认）
 */
import { useState, useRef } from 'react';
import { Zap } from 'lucide-react';
import TxDeleteButton from '@/shared/components/TxDeleteButton';
import { resolveCategoryIcon, getCategoryColor, tintColor } from '@/shared/components/CategoryIcons';
import { MoneyUtils } from '@/core/types';
import type { Category } from '@/domain/entities/Category';

function highlight(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FFF3B0', color: 'inherit', padding: '0 1px', borderRadius: 2 }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

export default function TxItem({ cat, fallbackName, note, time, account, amount, type, tags, keyword, onLongPress, onDelete }: {
  cat: Category | null; fallbackName: string; note: string; time: string;
  account: string; amount: number; type: string; tags: string[]; keyword?: string;
  onLongPress: () => void; onDelete?: () => void;
}) {
  const isExpense = type === 'expense';
  const isIncome = type === 'income';
  const name = cat?.name ?? fallbackName;
  const IconComp = cat ? resolveCategoryIcon(cat) : Zap;
  const color = cat ? (cat.color || getCategoryColor(cat.name)) : getCategoryColor(name);
  const lpRef = useRef<number | null>(null);
  const startPress = () => { lpRef.current = window.setTimeout(onLongPress, 600); };
  const cancelPress = () => { if (lpRef.current !== null) { clearTimeout(lpRef.current); lpRef.current = null; } };

  // 左滑露出删除
  const [dx, setDx] = useState(0);
  const sx = useRef<number | null>(null);
  const sy = useRef<number | null>(null);
  const dragging = useRef(false);

  function tStart(e: React.TouchEvent) {
    startPress();
    const t = e.touches[0];
    if (!t) return;
    sx.current = t.clientX; sy.current = t.clientY; dragging.current = false;
  }
  function tMove(e: React.TouchEvent) {
    cancelPress();
    const t = e.touches[0];
    if (!t || sx.current === null) return;
    const d = t.clientX - sx.current;
    const dy = Math.abs(t.clientY - (sy.current ?? t.clientY));
    if (Math.abs(d) > dy) {
      dragging.current = true;
      if (d < 0) setDx(Math.max(-84, d));
      else setDx(0);
    }
  }
  function tEnd() {
    cancelPress();
    setDx((prev) => (prev < -40 ? -84 : 0));
    sx.current = null; sy.current = null;
    setTimeout(() => { dragging.current = false; }, 0);
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', borderBottom: '1px solid var(--color-bg-secondary)' }}>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); setDx(0); onDelete(); }}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 84,
            border: 'none', background: 'var(--color-expense)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          删除
        </button>
      )}

      <div
        className="row-press"
        role="button"
        aria-label="长按编辑，左滑删除"
        onTouchStart={tStart}
        onTouchEnd={tEnd}
        onTouchMove={tMove}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 8px', background: 'var(--color-card)',
          position: 'relative', zIndex: 1,
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? 'none' : 'transform 180ms ease',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: tintColor(color),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconComp size={16} strokeWidth={1.8} color={color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlight(name, keyword ?? '')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {time}
              {note && <> · {highlight(note, keyword ?? '')}</>}
              {account && ` · ${account}`}
              {tags.length > 0 && ` · ${tags.join(' ')}`}
            </div>
          </div>
        </div>
        <span style={{
          fontWeight: 600, fontSize: 14, marginLeft: 12, whiteSpace: 'nowrap',
          color: isExpense ? 'var(--color-expense)' : isIncome ? 'var(--color-income)' : 'var(--color-transfer)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isExpense ? '-' : isIncome ? '+' : ''}{MoneyUtils.format(amount).replace('¥', '')}
        </span>
        {onDelete && <TxDeleteButton onDelete={onDelete} />}
      </div>
    </div>
  );
}
