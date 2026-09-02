/**
 * 底部弹层 — 遮罩 + 底部白卡片
 *
 * 统一全 App 的 bottom sheet 视觉，替代样式不可控的原生 <select>。
 * 复用模式参考 TransactionForm 的 AccountPicker。
 */
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <div
      className="sheet-mask"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'sheetFade 180ms ease',
      }}
    >
      <div
        className="sheet-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-card)',
          borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 500,
          maxHeight: '70vh', overflowY: 'auto',
          padding: '16px 16px 28px',
          animation: 'sheetUp 220ms ease',
        }}
      >
        <div style={{
          fontSize: 16, fontWeight: 700,
          color: 'var(--color-text-primary)', marginBottom: 12,
        }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

interface SheetOptionProps {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onSelect: () => void;
}

/** 弹层列表项：选中项右侧打勾、文字变主色 */
export function SheetOption({ label, icon, selected, onSelect }: SheetOptionProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', minHeight: 48,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px',
        border: 'none',
        borderBottom: '1px solid var(--color-divider)',
        background: 'transparent',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      {icon}
      <span style={{
        flex: 1, fontSize: 14, fontWeight: selected ? 600 : 500,
        color: selected ? 'var(--color-primary)' : 'var(--color-text-primary)',
      }}>
        {label}
      </span>
      {selected && <Check size={17} strokeWidth={2.5} color="var(--color-primary)" />}
    </button>
  );
}
