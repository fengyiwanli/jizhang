/**
 * 交易列表 — 现代极简风格，含删除确认
 */
import { useState } from 'react';
import { useTransactionStore } from '@/features/transaction/store';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import { useToast } from '@/shared/hooks/useToast';
import { Zap, Trash2 } from 'lucide-react';

export default function TransactionList() {
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      useToast.getState().success('已删除');
    } catch {
      useToast.getState().error('删除失败');
    }
    setDeletingId(null);
  }

  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  if (loading) return <p style={{ color: '#8E8E93', textAlign: 'center', padding: 24, fontSize: 13 }}>加载中...</p>;

  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#C7C7CC' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>—</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>暂无记录</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>开始记录你的第一笔账单吧</div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .filter(([date]) => date === today)
        .map(([date, txs]) => {
          const dayExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const dayIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

          return (
            <div key={date} style={{ marginBottom: 8 }}>
              {/* 日期头 */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 4px 6px',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', letterSpacing: -0.2 }}>
                  {fmtDate(date, today)}
                </span>
                <span style={{ fontSize: 11, color: '#8E8E93' }}>
                  {dayExpense > 0 && <span style={{ color: '#E07B6C', marginRight: 6 }}>支出 ¥{(dayExpense / 100).toFixed(0)}</span>}
                  {dayIncome > 0 && <span style={{ color: '#5FBB97' }}>收入 ¥{(dayIncome / 100).toFixed(0)}</span>}
                </span>
              </div>

              {/* 交易卡片 */}
              <div style={{
                background: '#FFF', borderRadius: 16,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                {txs.map((tx, i) => {
                  const fmt = formatTransaction(tx);
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isExpense = tx.type === 'expense';
                  const color = cat?.color ?? getCategoryColor(cat?.name ?? '');
                  const IconComp = getCategoryIcon(cat?.name ?? '') ?? Zap;

                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderBottom: i < txs.length - 1 ? '1px solid #F5F5F7' : 'none',
                      }}
                    >
                      {/* 左侧: 图标 + 文字 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40,
                          borderRadius: 12,
                          background: '#F5F5F7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <IconComp size={18} strokeWidth={1.8} color={color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>
                            {cat?.name ?? fmt.typeLabel}
                          </div>
                          <div style={{
                            fontSize: 11, color: '#8E8E93', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            letterSpacing: 0.2,
                          }}>
                            {acc ? `${acc.icon ?? ''}${acc.name} ` : ''}
                            {tx.note || tx.time?.slice(0, 5)}
                          </div>
                        </div>
                      </div>

                      {/* 右侧: 金额 + 删除 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontWeight: 600, fontSize: 15,
                          color: isExpense ? '#E07B6C' : '#5FBB97',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap', letterSpacing: -0.2,
                        }}>
                          {isExpense ? '-' : '+'}¥{(tx.amount / 100).toFixed(2)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                          disabled={deletingId === tx.id}
                          style={{
                            border: 'none', background: deletingId === tx.id ? '#F5F5F7' : 'transparent',
                            borderRadius: 8, cursor: deletingId === tx.id ? 'not-allowed' : 'pointer',
                            padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: deletingId === tx.id ? 0.4 : 1, transition: 'all 150ms',
                          }}
                        >
                          <Trash2 size={15} color={deletingId === tx.id ? '#C0C0C0' : '#D1D1D6'} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function fmtDate(dateStr: string, today: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  if (dateStr === today) return '今天';
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === yesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}
