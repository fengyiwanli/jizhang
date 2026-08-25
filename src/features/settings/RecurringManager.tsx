/**
 * 固定收支管理页面 — 周期账单规则
 */
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { frequencyLabel, type Frequency, type RecurringRule } from '@/data/repositories/RecurringRepository';
import { useAccountStore } from '@/features/account/store';
import { useCategoryStore } from '@/features/category/store';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import { todayLocal } from '@/core/datetime';
import { MoneyUtils, type UUID, type TransactionType } from '@/core/types';

interface Props { onBack: () => void; }

export default function RecurringManager({ onBack }: Props) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { recurringRepo } = getAppContext();
    setRules(await recurringRepo.list());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: UUID) {
    const { recurringRepo } = getAppContext();
    await recurringRepo.delete(id);
    useToast.getState().success('已删除');
    load();
  }

  async function handleToggle(id: UUID, active: boolean) {
    const { recurringRepo } = getAppContext();
    await recurringRepo.toggle(id, active);
    load();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingRight: 12, paddingBottom: 12, paddingLeft: 12,
        background: '#F5F5F7', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 17, background: '#FFF',
          border: '1px solid #E8E8ED', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginRight: 8,
        }}>
          <ArrowLeft size={17} color="#1A1A2E" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: -0.3, flex: 1 }}>固定收支</h1>
        <button onClick={() => setShowForm(true)} style={{
          width: 34, height: 34, borderRadius: 17, background: '#4ECDC4',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Plus size={18} color="#FFF" />
        </button>
      </div>

      <div style={{ padding: '12px 16px 40px', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 12, paddingLeft: 4 }}>
          设定固定收入或支出，到期自动记一笔
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#8E8E93', fontSize: 13, padding: 20 }}>加载中...</p>}
        {!loading && rules.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#C7C7CC' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>暂无固定收支</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>点击右上角 + 添加</div>
          </div>
        )}

        {rules.map((r) => {
          const acc = accounts.find((a) => a.id === r.accountId);
          const cat = categories.find((c) => c.id === r.categoryId);
          const isExpense = r.type === 'expense';
          return (
            <div key={r.id} style={{
              background: '#FFF', borderRadius: 14, padding: '14px 16px',
              marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              opacity: r.isActive ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: isExpense ? '#E07B6C' : '#5FBB97',
                    }}>
                      {isExpense ? '支出' : '收入'}
                    </span>
                    <span style={{ fontSize: 13, color: '#8E8E93' }}>
                      {frequencyLabel(r.frequency)}
                      {r.interval > 1 ? ` (每${r.interval}期)` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginTop: 3 }}>
                    {MoneyUtils.format(r.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc ? `${acc.icon ?? ''}${acc.name}` : ''}{cat ? ` · ${cat.name}` : ''}{r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggle(r.id, !r.isActive)}
                    style={{
                      border: 'none', padding: '6px 12px', borderRadius: 8,
                      background: r.isActive ? '#E8F8F5' : '#F5F5F7',
                      color: r.isActive ? '#4ECDC4' : '#8E8E93',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {r.isActive ? '已启用' : '已暂停'}
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer' }}
                  >
                    <Trash2 size={15} color="#D1D1D6" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <RecurringForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); loadTransactions(200); }}
        />
      )}
    </div>
  );
}

function RecurringForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [interval, setInterval] = useState('1');
  const [nextRun, setNextRun] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const typeCategories = categories.filter((c) => c.type === type && !c.parentId);
  const amountYuan = parseFloat(amountStr) || 0;
  const canSave = amountYuan > 0 && !!accountId && (type === 'expense' || type === 'income');

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const { recurringRepo } = getAppContext();
      await recurringRepo.create({
        type,
        amountInYuan: amountYuan,
        accountId,
        categoryId: categoryId || null,
        frequency,
        interval: Math.max(1, parseInt(interval) || 1),
        nextRun,
        note: note.trim(),
      });
      useToast.getState().success('已添加固定收支');
      onSaved();
    } catch {
      useToast.getState().error('添加失败');
    }
    setSaving(false);
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFF', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto',
        padding: '20px 20px 28px',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>添加固定收支</div>

        {/* 类型 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <TypeBtn active={type === 'expense'} color="#E07B6C" onClick={() => { setType('expense'); setCategoryId(''); }}>支出</TypeBtn>
          <TypeBtn active={type === 'income'} color="#5FBB97" onClick={() => { setType('income'); setCategoryId(''); }}>收入</TypeBtn>
        </div>

        {/* 金额 */}
        <label style={labelStyle}>金额（元）</label>
        <input type="number" inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0.00" style={inputStyle} />

        {/* 账户 */}
        <label style={labelStyle}>账户</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={inputStyle}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon ?? ''} {a.name}</option>)}
        </select>

        {/* 分类 */}
        <label style={labelStyle}>分类</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
          <option value="">不指定</option>
          {typeCategories.map((c) => <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>)}
        </select>

        {/* 频率 */}
        <label style={labelStyle}>频率</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as Frequency[]).map((f) => (
            <TypeBtn key={f} active={frequency === f} color="#6C7AE0" onClick={() => setFrequency(f)}>{frequencyLabel(f)}</TypeBtn>
          ))}
        </div>

        {/* 周期间隔 + 下次执行 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>每几期一次</label>
            <input type="number" value={interval} onChange={(e) => setInterval(e.target.value)} min="1" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>开始日期</label>
            <input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* 备注 */}
        <label style={labelStyle}>备注</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：房租" style={inputStyle} />

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', border: '1px solid #E8E8ED', borderRadius: 12,
            background: '#FFF', color: '#1A1A2E', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>取消</button>
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
            background: canSave ? '#4ECDC4' : '#E8E8ED',
            color: canSave ? '#FFF' : '#C0C0C0', fontSize: 14, fontWeight: 600,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
          }}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  );
}

function TypeBtn({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', border: 'none', borderRadius: 9,
      background: active ? color : '#F5F5F7',
      color: active ? '#FFF' : '#8E8E93',
      fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer',
      transition: 'all 180ms',
    }}>{children}</button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 6, marginTop: 2,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 10,
  fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#1A1A2E', background: '#FFF',
  marginBottom: 14, boxSizing: 'border-box',
};
