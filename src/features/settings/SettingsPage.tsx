/**
 * 「我的」Tab 设置页面
 */
import { useEffect, useState } from 'react';
import AccountManager from '@/features/account/AccountManager';
import CategoryManager from '@/features/category/CategoryManager';
import DataExport from '@/features/settings/DataExport';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { getAppContext } from '@/data/init';

export default function SettingsPage() {
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadTransactions(10000);
  }, []);

  // 总资产走 SQL 聚合
  useEffect(() => {
    const { accountRepo } = getAppContext();
    Promise.all(accounts.map(async (a) => accountRepo.getBalance(a.id)))
      .then((list) => setTotal(list.reduce((s, v) => s + v, 0)));
  }, [accounts, transactions]);

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      {/* 应用标题 */}
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h2 style={{ fontSize: 20, color: 'var(--color-text-primary)', margin: 0 }}>记一笔</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>个人记账 · 本地优先</p>
      </div>

      {/* 总资产 */}
      <Section>
        <div style={{
          background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          borderRadius: 14, padding: '18px 20px', color: 'var(--color-card)',
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
      background: 'var(--color-card)', borderRadius: 16, padding: 14, marginBottom: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  );
}
