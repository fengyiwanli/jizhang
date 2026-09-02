/**
 * 底部 Tab 导航
 */
import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <>
      <div style={{ minHeight: '100vh' }}>
        {tabs.find((t) => t.key === activeTab)?.content}
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex',
        background: 'var(--color-card)',
        borderTop: '1px solid var(--color-divider)',
        padding: '6px 0 env(safe-area-inset-bottom, 8px)',
        zIndex: 100,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
      }}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className="tab-item"
              onClick={() => onTabChange(tab.key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '6px 0', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'transform var(--transition-press)',
              }}
            >
              {/* 选中指示器：小圆点 */}
              <span style={{
                width: 4, height: 4, borderRadius: 2, marginBottom: 3,
                background: 'var(--color-primary)',
                opacity: active ? 1 : 0,
                transition: 'opacity 180ms ease',
              }} />
              <Icon
                size={23}
                strokeWidth={active ? 2.2 : 1.6}
                color={active ? 'var(--color-primary)' : 'var(--color-text-tertiary)'}
                style={{ transition: 'all 180ms ease' }}
              />
              <span style={{
                fontSize: 10, marginTop: 3,
                color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                fontWeight: active ? 600 : 400,
                transition: 'color 180ms ease, font-weight 180ms ease',
                letterSpacing: 0.2,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
