/**
 * 账户管理组件 — 列表 + 新增/编辑表单
 */
import { useState, useEffect } from 'react';
import { Banknote, Building2, CreditCard, Smartphone, type LucideIcon } from 'lucide-react';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { getAppContext } from '@/data/init';
import { useToast } from '@/shared/hooks/useToast';
import type { Account } from '@/domain/entities/Account';
import type { AccountType } from '@/core/types';

const accountTypes: { value: AccountType; label: string; icon: LucideIcon }[] = [
  { value: 'cash', label: '现金', icon: Banknote },
  { value: 'bank', label: '银行卡', icon: Building2 },
  { value: 'credit', label: '信用卡', icon: CreditCard },
  { value: 'e-wallet', label: '电子钱包', icon: Smartphone },
];

export default function AccountManager() {
  const { accounts, loadAccounts } = useAccountStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  useEffect(() => {
    loadAccounts();
    loadTransactions(200);
  }, []);

  // 计算各账户余额
  const balances: Record<string, number> = {};
  for (const acc of accounts) {
    let b = acc.initialBalance ?? 0;
    for (const tx of transactions) {
      if (tx.type === 'income' && tx.accountId === acc.id) b += tx.amount;
      if (tx.type === 'expense' && tx.accountId === acc.id) b -= tx.amount;
      if (tx.type === 'transfer') {
        if (tx.accountId === acc.id) b -= tx.amount;
        if (tx.toAccountId === acc.id) b += tx.amount;
      }
    }
    balances[acc.id] = b;
  }

  function handleEdit(acc: Account) {
    setEditingAccount(acc);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingAccount(null);
    setShowForm(true);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', margin: 0 }}>账户管理</h3>
        <button onClick={handleAdd} style={addBtnStyle}>+ 添加</button>
      </div>

      {accounts.map((acc) => {
            const AccIcon = accountTypes.find((t) => t.value === acc.type)?.icon ?? Banknote;
            return (
        <div
          key={acc.id}
          onClick={() => handleEdit(acc)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: '#FFF', borderRadius: 12,
            marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: '#F5F5F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AccIcon size={20} strokeWidth={1.8} color="#4ECDC4" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>{acc.name}</div>
              <div style={{ fontSize: 11, color: '#8E8E93' }}>
                {accountTypes.find((t) => t.value === acc.type)?.label ?? acc.type}
                {acc.creditLimit ? ` · 额度 ¥${(acc.creditLimit / 100).toFixed(0)}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: '#1A1A2E',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ¥{((balances[acc.id] ?? 0) / 100).toFixed(0)}
            </span>
            <span style={{ fontSize: 11, color: '#B0B0B0' }}>›</span>
          </div>
        </div>
      );
      })}

      {showForm && (
        <AccountForm
          account={editingAccount}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadAccounts(); }}
        />
      )}
    </div>
  );
}

function AccountForm({ account, onClose, onSaved }: {
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash');
  const [icon, setIcon] = useState(account?.icon ?? '');
  const [balanceStr, setBalanceStr] = useState(account ? String((account.initialBalance ?? 0) / 100) : '');
  const [creditStr, setCreditStr] = useState(account?.creditLimit ? String(account.creditLimit / 100) : '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { accountRepo } = getAppContext();
      const initialBalanceInYuan = parseFloat(balanceStr) || 0;
      const creditLimitInYuan = parseFloat(creditStr) || undefined;
      if (account) {
        await accountRepo.update(account.id, {
          name: name.trim(),
          type,
          icon: icon || null,
          initialBalanceInYuan,
          creditLimitInYuan,
        });
      } else {
        await accountRepo.create({
          ledgerId: '',
          name: name.trim(),
          type,
          icon: icon || null,
          initialBalanceInYuan,
          creditLimitInYuan,
        });
      }
      setSaving(false);
      onSaved();
    } catch {
      setSaving(false);
      useToast.getState().error(account ? '更新账户失败' : '创建账户失败');
    }
  }

  async function handleDelete() {
    if (!account) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      const { accountRepo } = getAppContext();
      await accountRepo.delete(account.id);
      setSaving(false);
      onSaved();
    } catch {
      setSaving(false);
      useToast.getState().error('删除账户失败');
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 500, background: '#FFF',
        borderRadius: '20px 20px 0 0', padding: '20px 16px',
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: '#1A1A2E', margin: 0 }}>
            {account ? '编辑账户' : '添加账户'}
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* 名称 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>账户名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：工资卡" style={fieldStyle} />
        </div>

        {/* 类型 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>账户类型</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {accountTypes.map((t) => {
              const TI = t.icon;
              return (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                style={{
                  padding: '10px', border: type === t.value ? '2px solid #4ECDC4' : '1px solid #E0E0E0',
                  borderRadius: 10, background: type === t.value ? '#E8FAF8' : '#FFF',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  color: type === t.value ? '#1A1A2E' : '#7F8C8D',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <TI size={16} strokeWidth={1.8} /> {t.label}
              </button>
              );
            })}
          </div>
        </div>

        {/* 图标 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>图标 (emoji)</label>
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="如 🏦" style={{ ...fieldStyle, width: 80, textAlign: 'center', fontSize: 20 }} />
        </div>

        {/* 初始余额 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            {type === 'credit' ? '当前欠款 (¥)' : '当前余额 (¥)'}
          </label>
            <input
              type="number"
              inputMode="decimal"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              placeholder={type === 'credit' ? '如 5000' : '如 10000'}
              style={fieldStyle}
            />
            <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2, paddingLeft: 2 }}>
              {type === 'credit'
                ? '如已欠款 ¥5,000，请填 5000（根据 4.2 节，信用卡余额将以负数显示）'
                : '该账户当前的资金余额'}
            </div>
          </div>

        {/* 信用额度 (仅信用卡) */}
        {type === 'credit' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>信用额度 (¥)</label>
            <input
              type="number"
              inputMode="decimal"
              value={creditStr}
              onChange={(e) => setCreditStr(e.target.value)}
              placeholder="如 20000"
              style={fieldStyle}
            />
          </div>
        )}

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{
            flex: 1, padding: '12px 0', border: 'none', borderRadius: 12,
            background: name.trim() ? '#4ECDC4' : '#E0E0E0', color: '#FFF',
            fontSize: 15, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}>
            {saving ? '保存中...' : account ? '更新' : '创建'}
          </button>
          {account && (
            <button onClick={handleDelete} disabled={saving} style={{
              padding: '12px 20px', border: 'none', borderRadius: 12,
              background: confirmDelete ? '#FF6B6B' : '#FFF3F3',
              color: confirmDelete ? '#FFF' : '#FF6B6B',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {confirmDelete ? '确认删除？' : '删除'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#8E8E93', marginBottom: 4, paddingLeft: 2,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: 'none', borderRadius: 12,
  fontSize: 14, color: '#1A1A2E', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  background: '#F5F5F7',
};

const addBtnStyle: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #4ECDC4', borderRadius: 8,
  background: 'transparent', color: '#4ECDC4', fontSize: 13,
  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
};

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: '#F0F2F5', borderRadius: 20, width: 28, height: 28,
  fontSize: 14, cursor: 'pointer',
};
