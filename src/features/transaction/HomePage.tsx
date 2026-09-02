/**
 * 首页 — 现代极简风格
 * 余额/预算/今日概览均使用 SQL 聚合，不遍历 transactions
 */
import { useEffect, useState } from 'react';
import { Banknote, Building2, CreditCard, Smartphone } from 'lucide-react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { todayLocal } from '@/core/datetime';
import { getAppContext } from '@/data/init';

export default function HomePage({ defAccountId, onTagClick, onAccountClick }: {
  defAccountId?: string | null;
  onTagClick?: (tag: string) => void;
  onAccountClick?: (accountId: string) => void;
}) {
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);

  const [budgetInYuan, setBudgetInYuan] = useState<number | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [monthSpent, setMonthSpent] = useState(0);
  const [todayData, setTodayData] = useState<{ expense: number; income: number; count: number } | null>(null);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadTransactions(10000);
  }, []);

  // 余额、预算、本月支出、今日概览全部走 SQL 聚合
  useEffect(() => {
    const { accountRepo, budgetRepo, statsRepo } = getAppContext();
    const ym = todayLocal().slice(0, 7);
    const today = todayLocal();

    Promise.all(accounts.map(async (a) => [a.id, await accountRepo.getBalance(a.id)] as const))
      .then((entries) => setBalances(Object.fromEntries(entries)));

    budgetRepo.getTotalBudget(ym).then((amount) => setBudgetInYuan(amount !== null ? amount / 100 : null));
    budgetRepo.getMonthSpent(ym).then(setMonthSpent);
    statsRepo.getRangeSummary(today, today).then(setTodayData);
  }, [accounts, transactions]);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 资产总览 */}
      <AssetsBar accounts={accounts} balances={balances} onAccountClick={onAccountClick} />

      {/* 本月预算进度 */}
      <BudgetBar spent={monthSpent} budgetInYuan={budgetInYuan} />

      {/* 记账表单卡片 */}
      <div style={{
        margin: '12px 16px',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      }}>
        <TransactionForm defAccountId={defAccountId} />
      </div>

      {/* 今日概览 */}
      <TodayBar todayData={todayData} />

      {/* 最近交易 */}
      <div style={{ padding: '0 16px' }}>
        <TransactionList onTagClick={onTagClick} />
      </div>
    </div>
  );
}

function AssetsBar({ accounts, balances, onAccountClick }: {
  accounts: { id: string; name: string; type: string; icon: string | null }[];
  balances: Record<string, number>;
  onAccountClick?: (accountId: string) => void;
}) {
  if (accounts.length === 0) return null;

  const total = Object.values(balances).reduce((s, v) => s + v, 0);

  return (
    <div style={{
      margin: '16px 16px 0', padding: '20px 20px',
      background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
      borderRadius: 20, color: 'var(--color-card)',
      boxShadow: '0 4px 20px rgba(78,205,196,0.25)',
    }}>
      <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
        总资产
      </div>
      {/* 金额加载完成时渐入 */}
      <div key={total} style={{
        fontSize: 32, fontWeight: 700, letterSpacing: -0.5,
        fontVariantNumeric: 'tabular-nums', marginBottom: 14,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        animation: 'fadeUp 300ms ease',
      }}>
        ¥{(total / 100).toFixed(2)}
      </div>
      {/* 逐账户展示 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {accounts.map((acc) => {
          const AccIcon = acc.type === 'cash' ? Banknote
            : acc.type === 'credit' ? CreditCard
            : acc.type === 'bank' ? Building2 : Smartphone;
          return (
          <div key={acc.id} className="press-soft" onClick={() => onAccountClick?.(acc.id)} style={{ cursor: 'pointer', borderRadius: 8, padding: '2px 4px', margin: '-2px -4px' }}>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <AccIcon size={12} strokeWidth={2} /> {acc.name}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.2 }}>
              ¥{((balances[acc.id] ?? 0) / 100).toFixed(2)}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetBar({ spent, budgetInYuan }: {
  spent: number;
  budgetInYuan: number | null;
}) {
  if (budgetInYuan === null || budgetInYuan <= 0) return null;

  const budget = Math.round(budgetInYuan * 100);
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const remain = budget - spent;
  const color = pct < 80 ? 'var(--color-primary)' : pct <= 100 ? '#FF9F43' : 'var(--color-expense)';
  const overSpent = remain < 0;

  return (
    <div style={{
      margin: '10px 16px 0', padding: '14px 20px',
      background: 'var(--color-card)', borderRadius: 16,
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>本月预算</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-divider)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${Math.min(pct, 100)}%`,
          background: color,
          transition: 'width 300ms ease, background 300ms ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          已用 <span style={{ color: color, fontWeight: 600 }}>¥{(spent / 100).toFixed(2)}</span> / ¥{(budget / 100).toFixed(2)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: overSpent ? 'var(--color-expense)' : 'var(--color-text-secondary)' }}>
          {overSpent ? `已超支 ¥${(-remain / 100).toFixed(2)}` : `剩余 ¥${(remain / 100).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

function TodayBar({ todayData }: { todayData: { expense: number; income: number; count: number } | null }) {
  if (!todayData || todayData.count === 0) return null;

  return (
    <div style={{
      margin: '10px 16px', padding: '14px 20px',
      background: 'var(--color-card)', borderRadius: 16,
      display: 'flex', justifyContent: 'space-around',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    }}>
      <TodayBlock label="今日支出" value={todayData.expense} color="var(--color-expense)" />
      <div style={{ width: 1, background: 'var(--color-divider)' }} />
      <TodayBlock label="今日收入" value={todayData.income} color="var(--color-income)" />
      <div style={{ width: 1, background: 'var(--color-divider)' }} />
      <TodayBlock label="笔数" value={todayData.count} color="var(--color-text-primary)" isCount />
    </div>
  );
}

function TodayBlock({ label, value, color, isCount }: {
  label: string; value: number; color: string; isCount?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
        {isCount ? value : `¥${(value / 100).toFixed(2)}`}
      </div>
    </div>
  );
}
