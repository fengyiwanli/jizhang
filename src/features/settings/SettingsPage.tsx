/**
 * 「我的」Tab 设置页面
 */
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
  const categories = useCategoryStore((s) => s.categories);
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

      {/* 账户管理 — 抽屉盒 */}
      <Accordion title="账户管理" count={`${accounts.length} 个账户`} defaultOpen={false}>
        <AccountManager hideHeading />
      </Accordion>

      {/* 分类管理 — 抽屉盒（默认展开，保留 支出分类/收入分类 大标题分组） */}
      <Accordion title="分类管理" count={`${categories.length} 个分类`} defaultOpen>
        <CategoryManager hideHeading />
      </Accordion>

      {/* 数据导出 */}
      <Section>
        <DataExport />
      </Section>
    </div>
  );
}

/** 抽屉盒：点头部展开/收起内容 */
function Accordion({ title, count, defaultOpen = false, children }: {
  title: string; count?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'var(--color-card)', borderRadius: 16, padding: '0 14px', marginBottom: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        className="row-press"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', padding: '13px 0',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
          {count && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{count}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          color="var(--color-text-tertiary)"
          style={{ flexShrink: 0, transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div style={{ padding: '2px 0 12px' }}>{children}</div>
      )}
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
