/**
 * Toast 通知组件 — 浮层消息提示
 *
 * 定位在页面顶部居中，支持 success / error / info 三种样式。
 * 从 useToast hook 驱动。
 */
import { useToast } from '@/shared/hooks/useToast';

const TYPE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  success: { bg: '#EDF8F0', fg: '#2E7D32', border: '#A5D6A7' },
  error:   { bg: '#FFF3F3', fg: '#C62828', border: '#EF9A9A' },
  info:    { bg: '#F0F4FF', fg: '#1A237E', border: '#9FA8DA' },
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      maxWidth: '90vw',
    }}>
      {toasts.map((t) => {
        const c = TYPE_COLORS[t.type] ?? TYPE_COLORS.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: c.bg,
              color: c.fg,
              border: `0.5px solid ${c.border}`,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              animation: 'toastIn 0.25s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
