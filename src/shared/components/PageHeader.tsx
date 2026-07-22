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
      padding: '12px 16px', background: '#F5F5F7',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: -0.3 }}>
        {title}
      </h1>
      <button
        onClick={onSettings}
        style={{
          width: 34, height: 34, borderRadius: 17,
          background: '#FFF', border: '1px solid #E8E8ED',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Settings size={17} color="#8E8E93" strokeWidth={1.5} />
      </button>
    </div>
  );
}
