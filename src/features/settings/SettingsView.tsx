/**
 * 设置页面 — 独立全屏页面
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { BottomSheet, SheetOption } from '@/shared/components/BottomSheet';
import { useAccountStore } from '@/features/account/store';
import { useCategoryStore } from '@/features/category/store';
import { getAppContext } from '@/data/init';
import { todayLocal } from '@/core/datetime';
import DataBackup from './DataBackup';

interface Props {
  defaultAccountId: string | null;
  defaultAccOnChange: (id: string | null) => void;
  budgetInYuan: number | null;
  budgetOnChange: (v: number | null) => void;
  onClearData: () => void;
  onOpenRecurring: () => void;
  onBack: () => void;
}

export default function SettingsView({
  defaultAccountId, defaultAccOnChange,
  budgetInYuan, budgetOnChange,
  onClearData, onOpenRecurring, onBack,
}: Props) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const [budgetStr, setBudgetStr] = useState(budgetInYuan !== null ? String(budgetInYuan) : '');
  const [showClear, setShowClear] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});

  const expenseRoots = categories.filter((c) => c.type === 'expense' && !c.parentId);
  const ym = todayLocal().slice(0, 7);

  // 读取分类预算
  useEffect(() => {
    const { budgetRepo } = getAppContext();
    budgetRepo.listCategoryBudgets(ym).then((list) => {
      const map: Record<string, string> = {};
      for (const b of list) map[b.categoryId] = String(b.amount / 100);
      setCatBudgets(map);
    });
  }, [ym]);

  function saveCategoryBudget(catId: string, val: string) {
    setCatBudgets((prev) => ({ ...prev, [catId]: val }));
    const { budgetRepo } = getAppContext();
    const v = parseFloat(val);
    if (!isNaN(v) && v > 0) budgetRepo.setCategoryBudget(ym, catId, v);
    else budgetRepo.removeCategoryBudget(ym, catId);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingRight: 12, paddingBottom: 12, paddingLeft: 12,
        background: 'var(--color-bg-secondary)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 17, background: 'var(--color-card)',
          border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginRight: 8,
        }}>
          <ArrowLeft size={17} color="var(--color-text-primary)" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.3 }}>设置</h1>
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

        {/* 分类预算 */}
        <Section>
          <div style={titleStyle}>分类预算</div>
          <div style={{ ...descStyle, marginBottom: 4 }}>为支出分类单独设预算额度（留空则不限）</div>
          {expenseRoots.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{c.icon ?? '📦'}</span> {c.name}
              </span>
              <input
                type="number"
                value={catBudgets[c.id] ?? ''}
                onChange={(e) => saveCategoryBudget(c.id, e.target.value)}
                placeholder="不限"
                style={{ ...amountInputStyle, width: 80 }}
              />
            </div>
          ))}
          {expenseRoots.length === 0 && (
            <div style={{ fontSize: 12, color: '#C7C7CC', padding: '8px 0' }}>暂无支出分类</div>
          )}
        </Section>

        {/* 默认账户 */}
        <Section>
          <div style={rowStyle}>
            <div>
              <div style={titleStyle}>默认记账账户</div>
              <div style={descStyle}>新建交易时默认选中的账户</div>
            </div>
            <button
              onClick={() => setShowAccountPicker(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                maxWidth: 130, minWidth: 0,
                padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 8,
                background: 'var(--color-card)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, color: 'var(--color-text-primary)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {defaultAccountId
                  ? accounts.find((a) => a.id === defaultAccountId)
                    ? `${accounts.find((a) => a.id === defaultAccountId)!.icon ?? ''} ${accounts.find((a) => a.id === defaultAccountId)!.name}`
                    : '不指定'
                  : '不指定'}
              </span>
              <ChevronDown size={13} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
            </button>
          </div>
        </Section>

        {/* 默认账户选择弹层 */}
        {showAccountPicker && (
          <BottomSheet title="默认记账账户" onClose={() => setShowAccountPicker(false)}>
            <SheetOption
              label="不指定"
              selected={!defaultAccountId}
              onSelect={() => { defaultAccOnChange(null); setShowAccountPicker(false); }}
            />
            {accounts.map((a) => (
              <SheetOption
                key={a.id}
                label={`${a.icon ?? ''} ${a.name}`.trim()}
                selected={defaultAccountId === a.id}
                onSelect={() => { defaultAccOnChange(a.id); setShowAccountPicker(false); }}
              />
            ))}
          </BottomSheet>
        )}

        {/* 固定收支 */}
        <Section>
          <div className="row-press" style={{ ...rowStyle, cursor: 'pointer', borderRadius: 8 }} onClick={onOpenRecurring}>
            <div style={{ flex: 1 }}>
              <div style={titleStyle}>固定收支</div>
              <div style={descStyle}>设置每日/每周/每月/每年的固定收入或支出</div>
            </div>
            <ArrowLeft size={14} color="#D1D1D6" style={{ transform: 'rotate(180deg)' }} />
          </div>
        </Section>

        {/* 备份与恢复 */}
        <Section>
          <div style={titleStyle}>备份与恢复</div>
          <div style={{ marginTop: 8 }}>
            <DataBackup />
          </div>
        </Section>

        {/* 数据管理 */}
        <Section>
          <div className="row-press" style={{ cursor: 'pointer', borderRadius: 8 }} onClick={() => setShowClear(!showClear)}>
            <div style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div style={{...titleStyle, color: 'var(--color-expense)'}}>清除所有数据</div>
                <div style={descStyle}>重置为初始状态，此操作不可撤销</div>
              </div>
              <ArrowLeft size={14} color="#D1D1D6" style={{
                transform: showClear ? 'rotate(-90deg)' : 'rotate(90deg)',
                transition: 'transform 200ms',
              }} />
            </div>
            {showClear && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-divider)' }}>
                <button onClick={onClearData} style={{
                  width: '100%', minHeight: 44, padding: '10px 0', border: 'none', borderRadius: 10,
                  background: '#FFE8E5', color: 'var(--color-expense)', fontSize: 13, fontWeight: 600,
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
      background: 'var(--color-card)', borderRadius: 14, padding: '14px 16px',
      marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {children}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
  overflow: 'hidden',
};
const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 };
const descStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 };
const amountInputStyle: React.CSSProperties = {
  width: 70, padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 8,
  fontSize: 14, textAlign: 'center', outline: 'none', fontFamily: 'inherit', color: 'var(--color-text-primary)',
};
