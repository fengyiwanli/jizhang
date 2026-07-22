/**
 * 设置页面 — 独立全屏页面
 */
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAccountStore } from '@/features/account/store';

interface Props {
  defaultAccountId: string | null;
  defaultAccOnChange: (id: string | null) => void;
  budgetInYuan: number | null;
  budgetOnChange: (v: number | null) => void;
  onClearData: () => void;
  onBack: () => void;
}

export default function SettingsView({
  defaultAccountId, defaultAccOnChange,
  budgetInYuan, budgetOnChange,
  onClearData, onBack,
}: Props) {
  const accounts = useAccountStore((s) => s.accounts);
  const [budgetStr, setBudgetStr] = useState(budgetInYuan !== null ? String(budgetInYuan) : '');
  const [showClear, setShowClear] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        background: '#F5F5F7', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 17, background: '#FFF',
          border: '1px solid #E8E8ED', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginRight: 8,
        }}>
          <ArrowLeft size={17} color="#1A1A2E" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: -0.3 }}>设置</h1>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 40px', maxWidth: 500, margin: '0 auto' }}>
        {/* 月预算 */}
        <Section>
          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>每月预算</div>
              <div style={descStyle}>设置后可在首页查看支出进度</div>
            </div>
            <input
              type="number"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
              onBlur={() => {
                const v = parseFloat(budgetStr);
                if (!isNaN(v) && v > 0) budgetOnChange(v);
                else { setBudgetStr(''); budgetOnChange(null); }
              }}
              placeholder="不限"
              style={amountInputStyle}
            />
          </div>
        </Section>

        {/* 默认账户 */}
        <Section>
          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>默认记账账户</div>
              <div style={descStyle}>新建交易时默认选中的账户</div>
            </div>
            <select
              value={defaultAccountId ?? ''}
              onChange={(e) => defaultAccOnChange(e.target.value || null)}
              style={selectStyle}
            >
              <option value="">不指定</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.icon ?? ''} {a.name}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* 数据管理 */}
        <Section>
          <div style={{ cursor: 'pointer' }} onClick={() => setShowClear(!showClear)}>
            <div style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div style={{...titleStyle, color: '#E07B6C'}}>清除所有数据</div>
                <div style={descStyle}>重置为初始状态，此操作不可撤销</div>
              </div>
              <ArrowLeft size={14} color="#D1D1D6" style={{
                transform: showClear ? 'rotate(-90deg)' : 'rotate(90deg)',
                transition: 'transform 200ms',
              }} />
            </div>
            {showClear && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F0F2' }}>
                <button onClick={onClearData} style={{
                  width: '100%', padding: '10px 0', border: 'none', borderRadius: 10,
                  background: '#FFE8E5', color: '#E07B6C', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  确认清除全部数据
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* 关于 */}
        <Section>
          <div style={titleStyle}>关于</div>
          <div style={{...descStyle, marginTop: 4 }}>
            <div>记一笔 v1.0</div>
            <div>React + TypeScript + SQLite (WASM)</div>
            <div style={{ marginTop: 2 }}>数据完全存储在浏览器本地 · 离线可用</div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFF', borderRadius: 14, padding: '14px 16px',
      marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {children}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
};
const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 };
const descStyle: React.CSSProperties = { fontSize: 11, color: '#8E8E93', lineHeight: 1.5 };
const amountInputStyle: React.CSSProperties = {
  width: 70, padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8,
  fontSize: 14, textAlign: 'center', outline: 'none', fontFamily: 'inherit', color: '#1A1A2E',
};
const selectStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #E0E0E0', borderRadius: 8,
  fontSize: 12, outline: 'none', fontFamily: 'inherit', color: '#1A1A2E', background: '#FFF',
};
