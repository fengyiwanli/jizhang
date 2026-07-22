/**
 * 首页 — 现代极简风格
 */
import { useEffect } from 'react';
import { Banknote, Building2, CreditCard, Smartphone } from 'lucide-react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';

export default function HomePage({ defAccountId }: { defAccountId?: string | null }) {
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadTransactions(200);
  }, []);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 资产总览 */}
      <AssetsBar accounts={accounts} transactions={transactions} />

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
      <TodayBar transactions={transactions} />

      {/* 最近交易 */}
      <div style={{ padding: '0 16px' }}>
        <TransactionList />
      </div>
    </div>
  );
}

function AssetsBar({ accounts, transactions }: {
  accounts: { id: string; name: string; type: string; icon: string | null; initialBalance: number }[];
  transactions: { type: string; amount: number; accountId: string; toAccountId: string | null }[];
}) {
  if (accounts.length === 0) return null;

  // 计算每个账户余额
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

  const total = Object.values(balances).reduce((s, v) => s + v, 0);

  return (
    <div style={{
      margin: '16px 16px 0', padding: '20px 20px',
      background: 'linear-gradient(145deg, #4ECDC4 0%, #3DBDB5 100%)',
      borderRadius: 20, color: '#FFF',
      boxShadow: '0 4px 20px rgba(78,205,196,0.25)',
    }}>
      <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
        总资产
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums', marginBottom: 14 }}>
        ¥{(total / 100).toFixed(2)}
      </div>
      {/* 逐账户展示 */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {accounts.map((acc) => {
          const AccIcon = acc.type === 'cash' ? Banknote
            : acc.type === 'credit' ? CreditCard
            : acc.type === 'bank' ? Building2 : Smartphone;
          return (
          <div key={acc.id}>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <AccIcon size={12} strokeWidth={2} /> {acc.name}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.2 }}>
              ¥{((balances[acc.id] ?? 0) / 100).toFixed(0)}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function TodayBar({ transactions }: { transactions: { type: string; amount: number; date: string }[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTxs = transactions.filter((t) => t.date === today);
  if (todayTxs.length === 0) return null;
  const expense = todayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = todayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{
      margin: '10px 16px', padding: '14px 20px',
      background: '#FFF', borderRadius: 16,
      display: 'flex', justifyContent: 'space-around',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    }}>
      <TodayBlock label="今日支出" value={expense} color="#E07B6C" />
      <div style={{ width: 1, background: '#F0F0F2' }} />
      <TodayBlock label="今日收入" value={income} color="#5FBB97" />
      <div style={{ width: 1, background: '#F0F0F2' }} />
      <TodayBlock label="笔数" value={todayTxs.length} color="#1A1A2E" isCount />
    </div>
  );
}

function TodayBlock({ label, value, color, isCount }: {
  label: string; value: number; color: string; isCount?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#8E8E93', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4, letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums' }}>
        {isCount ? value : `¥${(value / 100).toFixed(2)}`}
      </div>
    </div>
  );
}
