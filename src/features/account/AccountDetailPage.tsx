/**
 * 账户详情页 — 余额 + 流水列表 + 收支汇总
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, ArrowLeftRight } from 'lucide-react';
import { useAccountStore } from '@/features/account/store';
import { useCategoryStore } from '@/features/category/store';
import { useTransactionStore } from '@/features/transaction/store';
import TxDeleteButton from '@/shared/components/TxDeleteButton';
import { useToast } from '@/shared/hooks/useToast';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { getCategoryColor, resolveCategoryIcon, tintColor } from '@/shared/components/CategoryIcons';
import { todayLocal } from '@/core/datetime';
import { getAppContext } from '@/data/init';

export default function AccountDetailPage({ accountId, onBack }: { accountId: string; onBack: () => void }) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const transactions = useTransactionStore((s) => s.transactions);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);

  const acc = accounts.find((a) => a.id === accountId);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<{ expense: number; income: number; count: number }>({ expense: 0, income: 0, count: 0 });

  /** 删除某条流水并刷新余额/汇总 */
  async function handleDeleteTx(id: string) {
    try {
      await useTransactionStore.getState().deleteTransaction(id);
      useToast.getState().success('已删除');
      await loadTransactions(10000);
      const { accountRepo, statsRepo } = getAppContext();
      setBalance(await accountRepo.getBalance(accountId));
      setSummary(await statsRepo.getAccountSummary(accountId));
    } catch {
      useToast.getState().error('删除失败');
    }
  }

  useEffect(() => {
    loadTransactions(10000);
    const { accountRepo, statsRepo } = getAppContext();
    accountRepo.getBalance(accountId).then(setBalance);
    statsRepo.getAccountSummary(accountId).then(setSummary);
  }, [accountId]);

  // 该账户相关交易（仅用于流水列表展示，不参与金额计算）
  const accTxs = transactions.filter((t) => t.accountId === accountId || t.toAccountId === accountId);

  // 按日期分组降序
  const grouped = accTxs.reduce<Record<string, typeof accTxs>>((map, tx) => {
    if (!map[tx.date]) map[tx.date] = [];
    map[tx.date].push(tx);
    return map;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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
          cursor: 'pointer', marginRight: 10,
        }}>
          <ArrowLeft size={17} color="var(--color-text-primary)" />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.3 }}>
          {acc ? `${acc.icon ?? ''} ${acc.name}` : '账户'}
        </h1>
      </div>

      <div style={{ padding: '0 16px 40px', maxWidth: 500, margin: '0 auto' }}>
        {/* 余额卡 */}
        <div style={{
          margin: '12px 0', padding: '20px 20px',
          background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          borderRadius: 20, color: 'var(--color-card)',
          boxShadow: '0 4px 20px rgba(78,205,196,0.25)',
        }}>
          <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 0.5, marginBottom: 2 }}>当前余额</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>
            ¥{(balance / 100).toFixed(2)}
          </div>
        </div>

        {/* 收支汇总 */}
        <div style={{
          display: 'flex', justifyContent: 'space-around', padding: '14px 0',
          background: 'var(--color-card)', borderRadius: 16, marginBottom: 12,
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        }}>
          <SummaryBlock label="收入" value={summary.income} color="var(--color-income)" />
          <div style={{ width: 1, background: 'var(--color-divider)' }} />
          <SummaryBlock label="支出" value={summary.expense} color="var(--color-expense)" />
          <div style={{ width: 1, background: 'var(--color-divider)' }} />
          <SummaryBlock label="笔数" value={summary.count} color="var(--color-text-primary)" isCount />
        </div>

        {/* 流水列表 */}
        {accTxs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#C7C7CC' }}>
            <div style={{ fontSize: 36 }}>📭</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>该账户暂无流水</div>
          </div>
        )}

        {dates.map((date) => (
          <div key={date} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', padding: '6px 4px' }}>
              {fmtDate(date)}
            </div>
            <div style={{ background: 'var(--color-card)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {grouped[date].map((tx, i) => {
                const fmt = formatTransaction(tx);
                const cat = categories.find((c) => c.id === tx.categoryId);
                const isTransfer = tx.type === 'transfer';
                const color = isTransfer ? 'var(--color-transfer)' : (cat?.color ?? getCategoryColor(cat?.name ?? ''));
                const IconComp = isTransfer ? ArrowLeftRight
                  : (cat ? resolveCategoryIcon(cat) : Zap);
                // 该账户视角：转出/支出为负，收入/转入为正
                const isOut = tx.type === 'expense' || (tx.type === 'transfer' && tx.accountId === accountId);

                return (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: i < grouped[date].length - 1 ? '1px solid var(--color-bg-secondary)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        /* 图标底色跟随分类色 10% 透明度 */
                        background: tintColor(color),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <IconComp size={16} strokeWidth={1.8} color={color} />
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isTransfer ? '转账' : (cat?.name ?? fmt.typeLabel)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.time?.slice(0, 5)}{tx.note ? ` · ${tx.note}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
                      color: isTransfer ? 'var(--color-transfer)' : isOut ? 'var(--color-expense)' : 'var(--color-income)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {isTransfer ? '' : isOut ? '-' : '+'}¥{(tx.amount / 100).toFixed(2)}
                    </span>
                    <TxDeleteButton onDelete={() => handleDeleteTx(tx.id)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryBlock({ label, value, color, isCount }: {
  label: string; value: number; color: string; isCount?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {isCount ? value : `¥${(value / 100).toFixed(2)}`}
      </div>
    </div>
  );
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = todayLocal();
  const yesterday = (() => {
    const dd = new Date(Date.now() - 86400000);
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
  })();
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}
