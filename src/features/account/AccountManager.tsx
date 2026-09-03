/**
 * 账户管理组件 — 列表 + 新增/编辑表单
 */
import { useState, useEffect } from 'react';
import { Banknote, Building2, CreditCard, Smartphone, type LucideIcon } from 'lucide-react';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { getAppContext } from '@/data/init';
import { useToast } from '@/shared/hooks/useToast';
import { todayLocal, nowTimeLocal } from '@/core/datetime';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import type { Account } from '@/domain/entities/Account';
import type { AccountType } from '@/core/types';

const accountTypes: { value: AccountType; label: string; icon: LucideIcon }[] = [
  { value: 'cash', label: '现金', icon: Banknote },
  { value: 'bank', label: '银行卡', icon: Building2 },
  { value: 'credit', label: '信用卡', icon: CreditCard },
  { value: 'e-wallet', label: '电子钱包', icon: Smartphone },
];

export default function AccountManager({ hideHeading }: { hideHeading?: boolean } = {}) {
  const { accounts, loadAccounts } = useAccountStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAccounts();
    loadTransactions(10000);
  }, []);

  // 账户余额走 SQL 聚合
  useEffect(() => {
    const { accountRepo } = getAppContext();
    Promise.all(accounts.map(async (a) => [a.id, await accountRepo.getBalance(a.id)] as const))
      .then((entries) => setBalances(Object.fromEntries(entries)));
  }, [accounts, transactions]);

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
      {hideHeading ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button className="btn-pill" onClick={handleAdd}>+ 添加</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>账户管理</h3>
          <button className="btn-pill" onClick={handleAdd}>+ 添加</button>
        </div>
      )}

      {accounts.map((acc) => {
            const AccIcon = accountTypes.find((t) => t.value === acc.type)?.icon ?? Banknote;
            return (
        <div
          key={acc.id}
          className="row-press"
          onClick={() => handleEdit(acc)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--color-card)', borderRadius: 12,
            marginBottom: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--color-bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AccIcon size={20} strokeWidth={1.8} color="var(--color-primary)" />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {accountTypes.find((t) => t.value === acc.type)?.label ?? acc.type}
                {acc.creditLimit ? ` · 额度 ¥${(acc.creditLimit / 100).toFixed(2)}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ¥{((balances[acc.id] ?? 0) / 100).toFixed(2)}
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
          onSaved={() => {
            setShowForm(false);
            loadAccounts();
            // 余额调整会新增交易，需刷新交易列表，余额 effect 才会重算
            loadTransactions(10000);
          }}
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
  const [balanceStr, setBalanceStr] = useState('');
  const [creditStr, setCreditStr] = useState(account?.creditLimit ? String(account.creditLimit / 100) : '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 编辑已有账户：保存前真实余额（分）+ 该账户是否有交易
  const [realBalanceFen, setRealBalanceFen] = useState<number | null>(null);
  const [hasTransactions, setHasTransactions] = useState(false);

  // 打开编辑时，余额框显示「真实余额」（initialBalance + 收支），与账户列表一致
  // 信用卡且余额为负（欠款）时，展示为用户可读的正数欠款
  useEffect(() => {
    if (!account) {
      setBalanceStr('');
      setRealBalanceFen(null);
      setHasTransactions(false);
      return;
    }
    let cancelled = false;
    const { accountRepo, db } = getAppContext();
    accountRepo.getBalance(account.id)
      .then((fen) => {
        if (cancelled) return;
        setRealBalanceFen(fen);
        const owed = account.type === 'credit' && fen < 0 ? -fen : fen;
        setBalanceStr(String(Number((owed / 100).toFixed(2))));
      })
      .catch(() => {});
    db.query<{ cnt: number }>(
      'SELECT COUNT(*) cnt FROM transactions WHERE deleted_at IS NULL AND (account_id = ? OR to_account_id = ?)',
      [account.id, account.id],
    )
      .then((rows) => { if (!cancelled) setHasTransactions((rows[0]?.cnt ?? 0) > 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [account]);

  /** 把用户输入（元）换算为内部目标余额（分）。信用卡欠款模型下内部为负。 */
  function toTargetFen(v: number): number {
    const isCreditDebt = account?.type === 'credit' && (realBalanceFen ?? 0) < 0;
    const target = Math.round(v * 100);
    return isCreditDebt ? -target : target;
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { accountRepo, transactionRepo, categoryRepo } = getAppContext();
      const creditLimitInYuan = parseFloat(creditStr) || undefined;
      const v = parseFloat(balanceStr);
      const hasValue = !isNaN(v);

      if (account) {
        // 保存前的真实余额（与打开弹窗时一致）
        const currentReal = realBalanceFen ?? (await accountRepo.getBalance(account.id));

        if (!hasTransactions && hasValue) {
          // 该账户没有任何交易 → 直接调整期初余额（含信用卡符号方向）
          await accountRepo.update(account.id, {
            name: name.trim(),
            type,
            icon: icon || null,
            initialBalanceInYuan: toTargetFen(v) / 100,
            creditLimitInYuan,
          });
        } else {
          // 有交易 → 修改余额 = 生成一笔差额「余额调整」账单，而非改期初值
          let diff = 0;
          if (hasValue) {
            const target = toTargetFen(v);
            diff = target - currentReal;
          }
          if (Math.abs(diff) >= 1) {
            const t = diff > 0 ? 'income' : 'expense';
            const roots = await categoryRepo.listRoot(t);
            const otherCat = roots.find((c) => c.name.includes('其他')) ?? roots[0];
            const amountYuan = Math.abs(diff) / 100;
            await transactionRepo.create({
              ledgerId: DEFAULT_LEDGER_ID,
              type: t,
              amountInYuan: amountYuan,
              accountId: account.id,
              categoryId: otherCat?.id ?? null,
              date: todayLocal(),
              time: nowTimeLocal(),
              note: '余额调整',
            });
            useToast.getState().success(`已自动生成 ¥${amountYuan.toFixed(2)} 的余额调整`);
          }
          await accountRepo.update(account.id, {
            name: name.trim(),
            type,
            icon: icon || null,
            creditLimitInYuan,
          });
        }
      } else {
        // 新建账户：balanceStr → initialBalance（维持现状）
        const initialBalanceInYuan = hasValue ? v : 0;
        await accountRepo.create({
          ledgerId: DEFAULT_LEDGER_ID,
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
        width: '100%', maxWidth: 500, background: 'var(--color-card)',
        borderRadius: '20px 20px 0 0', padding: '20px 16px',
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: 'var(--color-text-primary)', margin: 0 }}>
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
                  padding: '10px', border: type === t.value ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 10, background: type === t.value ? 'var(--color-primary-light)' : 'var(--color-card)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  color: type === t.value ? 'var(--color-text-primary)' : '#7F8C8D',
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
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 2, lineHeight: 1.5 }}>
              {account
                ? '余额由收支自动计算。如与实际不符，修改保存后会自动生成一笔差额「余额调整」账单'
                : type === 'credit'
                  ? '填写当前欠款金额即可（保存后余额将按欠款方向显示）'
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
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{ flex: 1 }}
          >
            {saving ? '保存中...' : account ? '更新' : '创建'}
          </button>
          {account && (
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={saving}
              style={confirmDelete
                ? undefined
                : { background: 'var(--color-danger-soft)', color: 'var(--color-expense)', boxShadow: 'none' }}
            >
              {confirmDelete ? '确认删除？' : '删除'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, paddingLeft: 2,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: 'none', borderRadius: 12,
  fontSize: 14, color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  background: 'var(--color-bg-secondary)',
};

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 20, width: 28, height: 28,
  fontSize: 14, cursor: 'pointer',
};
