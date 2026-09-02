/**
 * 页面顶部栏 — 标题 + 右侧齿轮按钮
 */
import { Settings } from 'lucide-react';

interface Props {
  title: string;
  onSettings: () => void;
}

export default function PageHeader({ title, onSettings }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
      paddingRight: 16, paddingBottom: 12, paddingLeft: 16,
      background: 'var(--color-bg-secondary)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.3 }}>
        {title}
      </h1>
      <button
        onClick={onSettings}
        style={{
          width: 34, height: 34, borderRadius: 17,
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Settings size={17} color="var(--color-text-secondary)" strokeWidth={1.5} />
      </button>
    </div>
  );
}
