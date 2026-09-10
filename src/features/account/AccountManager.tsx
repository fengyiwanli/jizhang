/**
 * 账户管理组件 — 账户列表 + 新增/编辑（表单见 AccountFormSheet.tsx）
 */
import { useState, useEffect } from 'react';
import { services } from '@/data/services';
import { useDataVersion } from '@/shared/hooks/useDataVersion';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { accountTypes } from './accountTypes';
import AccountFormSheet from './AccountFormSheet';
import type { Account } from '@/domain/entities/Account';

export default function AccountManager({ hideHeading }: { hideHeading?: boolean } = {}) {
  const { accounts, loadAccounts } = useAccountStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const accVer = useDataVersion('accounts');
  const txVer = useDataVersion('transactions');

  useEffect(() => {
    loadAccounts();
    loadTransactions(10000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accVer, txVer]);

  // 账户余额走 SQL 聚合
  useEffect(() => {
    const { accountRepo } = services;
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
        const AccIcon = accountTypes.find((t) => t.value === acc.type)?.icon ?? accountTypes[0]!.icon;
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
        <AccountFormSheet
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
