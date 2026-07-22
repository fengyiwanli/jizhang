/**
 * 设置面板 — 从右上角齿轮入口打开的底部弹窗
 *
 * 功能：月预算 / 默认账户 / 数据管理 / 关于
 */
import { useState } from 'react';
import { Settings, X, ArrowRight } from 'lucide-react';
import { useAccountStore } from '@/features/account/store';

interface Props {
  defaultAccountId: string | null;
  defaultAccOnChange: (id: string | null) => void;
  budgetInYuan: number | null;
  budgetOnChange: (v: number | null) => void;
  onClearData: () => void;
}

export function SettingsSheet({ defaultAccountId, defaultAccOnChange, budgetInYuan, budgetOnChange, onClearData }: Props) {
  const [open, setOpen] = useState(false);
  const accounts = useAccountStore((s) => s.accounts);

  const [budgetStr, setBudgetStr] = useState(budgetInYuan !== null ? String(budgetInYuan) : '');
  const [showClear, setShowClear] = useState(false);

  return (
    <>
      {/* 右上角齿轮 */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 12, right: 12, zIndex: 50,
          width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid #E8E8ED', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Settings size={18} color="#8E8E93" strokeWidth={1.5} />
      </button>

      {/* 弹窗 */}
      {open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.25)', zIndex: 300,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setOpen(false)}>
          <div style={{
            width: '100%', maxWidth: 500, maxHeight: '75vh', overflow: 'auto',
            background: '#F5F5F7', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={18} color="#1A1A2E" />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>设置</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{
                width: 30, height: 30, borderRadius: 15, background: '#E8E8ED',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <X size={16} color="#8E8E93" />
              </button>
            </div>

            {/* 月预算 */}
            <SettingCard>
              <div style={rowStyle}>
                <div>
                  <div style={titleStyle}>每月预算</div>
                  <div style={descStyle}>设置后首页会显示预算进度</div>
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
            </SettingCard>

            {/* 默认记账账户 */}
            <SettingCard>
              <div style={rowStyle}>
                <div>
                  <div style={titleStyle}>默认账户</div>
                  <div style={descStyle}>记账时默认选中的账户</div>
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
            </SettingCard>

            {/* 数据管理 */}
            <SettingCard>
              <div style={{...rowStyle, cursor: 'pointer'}} onClick={() => setShowClear(!showClear)}>
                <div style={{ flex: 1 }}>
                  <div style={{...titleStyle, color: '#E07B6C'}}>清除所有数据</div>
                  <div style={descStyle}>重置所有账单、账户、分类到初始状态</div>
                </div>
                <ArrowRight size={14} color="#D1D1D6" style={{
                  transform: showClear ? 'rotate(90deg)' : 'none', transition: 'transform 200ms',
                }} />
              </div>
              {showClear && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0F0F2' }}>
                  <p style={{ fontSize: 11, color: '#E07B6C', marginBottom: 8 }}>此操作不可撤销，所有数据将被永久删除。</p>
                  <button onClick={() => { onClearData(); setOpen(false); }} style={{
                    width: '100%', padding: '10px 0', border: 'none', borderRadius: 10,
                    background: '#FFE8E5', color: '#E07B6C', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    确认清除
                  </button>
                </div>
              )}
            </SettingCard>

            {/* 关于 */}
            <SettingCard>
              <div style={{...titleStyle, marginBottom: 4}}>关于</div>
              <div style={descStyle}>
                <div>记一笔 v1.0 · React + TypeScript + SQLite (WASM)</div>
                <div>数据存储于浏览器本地，完全离线可用</div>
              </div>
            </SettingCard>
          </div>
        </div>
      )}
    </>
  );
}

function SettingCard({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
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
