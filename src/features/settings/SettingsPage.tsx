/**
 * 「我的」Tab 设置页面
 */
import { useEffect } from 'react';
import AccountManager from '@/features/account/AccountManager';
import CategoryManager from '@/features/category/CategoryManager';
import DataExport from '@/features/settings/DataExport';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';

export default function SettingsPage() {
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadTransactions(200);
  }, []);

  // 计算资产
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
    <div style={{ padding: '16px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      {/* 应用标题 */}
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h2 style={{ fontSize: 20, color: '#1A1A2E', margin: 0 }}>记一笔</h2>
        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>个人记账 · 本地优先</p>
      </div>

      {/* 总资产 */}
      <Section>
        <div style={{
          background: 'linear-gradient(145deg, #4ECDC4 0%, #3DBDB5 100%)',
          borderRadius: 14, padding: '18px 20px', color: '#FFF',
        }}>
          <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: 0.5, marginBottom: 2 }}>总资产</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            ¥{(total / 100).toFixed(2)}
          </div>
        </div>
      </Section>

      {/* 账户管理 */}
      <Section>
        <AccountManager />
      </Section>

      {/* 分类管理 */}
      <Section>
        <CategoryManager />
      </Section>

      {/* 数据导出 */}
      <Section>
        <DataExport />
      </Section>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  );
}
