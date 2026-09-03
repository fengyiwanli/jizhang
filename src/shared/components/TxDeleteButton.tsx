/**
 * 交易行内小删除按钮：点击一次变「确认删除」，再点一次才真正删除（防误触）
 * onPointerDown stopPropagation，避免触发行上的长按编辑。
 */
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export default function TxDeleteButton({ onDelete }: { onDelete: () => void }) {
  const [arm, setArm] = useState(false);

  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 2600);
    return () => clearTimeout(t);
  }, [arm]);

  return (
    <button
      aria-label="删除"
      title="删除（点两次确认）"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (arm) onDelete();
        else setArm(true);
      }}
      style={{
        border: 'none', borderRadius: 8, padding: '6px 7px',
        marginLeft: 8, flexShrink: 0, cursor: 'pointer',
        minWidth: arm ? 56 : 30, height: 30,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        fontFamily: 'inherit', fontSize: 12,
        background: arm ? 'var(--color-expense)' : 'var(--color-danger-soft)',
        color: arm ? '#FFF' : 'var(--color-expense)',
        transition: 'all 160ms ease',
      }}
    >
      {arm ? (
        <>确认删除</>
      ) : (
        <Trash2 size={14} strokeWidth={1.8} />
      )}
    </button>
  );
}
