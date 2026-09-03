/**
 * 交易列表 — 长按/点击删除按钮 → 确认弹窗 → 删除
 */
import { useState, useRef, useCallback } from 'react';
import { useTransactionStore } from '@/features/transaction/store';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { getCategoryColor, resolveCategoryIcon, tintColor } from '@/shared/components/CategoryIcons';
import { useToast } from '@/shared/hooks/useToast';
import { todayLocal } from '@/core/datetime';
import { Zap, Trash2, ArrowLeftRight } from 'lucide-react';

export default function TransactionList({ onTagClick }: { onTagClick?: (tag: string) => void }) {
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => setConfirmId(id), 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }
  const showConfirm = useCallback((id: string) => setConfirmId(id), []);
  const closeConfirm = useCallback(() => { if (!deleting) setConfirmId(null); }, [deleting]);

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteTransaction(confirmId);
      useToast.getState().success('已删除');
    } catch {
      useToast.getState().error('删除失败');
    }
    setDeleting(false);
    setConfirmId(null);
  }

  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  if (loading) return <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24, fontSize: 13 }}>加载中...</p>;

  const today = todayLocal();
  const todayEntries = Object.entries(grouped).filter(([date]) => date === today);

  if (todayEntries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#C7C7CC' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>—</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>今天还没有记录</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>记一笔今天的账单吧</div>
      </div>
    );
  }

  return (
    <>
      <div>
        {todayEntries
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, txs]) => {
            const dayExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const dayIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

            return (
              <div key={date} style={{ marginBottom: 8 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 4px 6px',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: -0.2 }}>
                    {fmtDate(date, today)}
                  </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dayExpense > 0 && <span style={{ color: 'var(--color-expense)', marginRight: 6 }}>支出 ¥{(dayExpense / 100).toFixed(2)}</span>}
                  {dayIncome > 0 && <span style={{ color: 'var(--color-income)' }}>收入 ¥{(dayIncome / 100).toFixed(2)}</span>}
                  </span>
                </div>

                <div style={{
                  background: 'var(--color-card)', borderRadius: 16,
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden',
                }}>
                  {txs.map((tx, i) => {
                    const fmt = formatTransaction(tx);
                    const cat = categories.find((c) => c.id === tx.categoryId);
                    const acc = accounts.find((a) => a.id === tx.accountId);
                    const toAcc = accounts.find((a) => a.id === tx.toAccountId);
                    const isExpense = tx.type === 'expense';
                    const isTransfer = tx.type === 'transfer';
                    const color = isTransfer ? 'var(--color-transfer)' : (cat?.color ?? getCategoryColor(cat?.name ?? ''));
                    const IconComp = isTransfer ? ArrowLeftRight
                      : (cat ? resolveCategoryIcon(cat) : Zap);

                    return (
                      <div
                        key={tx.id}
                        className="row-press"
                        onTouchStart={() => startLongPress(tx.id)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onMouseDown={() => startLongPress(tx.id)}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                        onContextMenu={(e) => { e.preventDefault(); showConfirm(tx.id); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 16px',
                          borderBottom: i < txs.length - 1 ? '1px solid var(--color-divider)' : 'none',
                          userSelect: 'none', WebkitUserSelect: 'none',
                        }}
                      >
                        {/* 左侧 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: tintColor(color),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <IconComp size={18} strokeWidth={1.8} color={color} />
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cat?.name ?? fmt.typeLabel}
                            </div>
                            <div style={{
                              fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              letterSpacing: 0.2,
                            }}>
                              {isTransfer
                                ? `${acc?.icon ?? ''}${acc?.name ?? ''} → ${toAcc?.icon ?? ''}${toAcc?.name ?? ''}`
                                : `${acc ? `${acc.icon ?? ''}${acc.name} ` : ''}${tx.note || tx.time?.slice(0, 5)}`}
                            </div>
                            {fmt.tagsList.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                                {fmt.tagsList.map((tag) => (
                                  <span key={tag} onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }} style={{
                                    fontSize: 10, color: '#2BAF9F', background: '#E8F8F5',
                                    padding: '1px 7px', borderRadius: 8, cursor: 'pointer',
                                  }}>
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 右侧 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontWeight: 600, fontSize: 15,
                            color: isTransfer ? 'var(--color-transfer)' : isExpense ? 'var(--color-expense)' : 'var(--color-income)',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap', letterSpacing: -0.2,
                          }}>
                            {isTransfer ? '' : isExpense ? '-' : '+'}¥{(tx.amount / 100).toFixed(2)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); showConfirm(tx.id); }}
                            style={{
                              border: 'none', background: 'transparent',
                              borderRadius: 8, cursor: 'pointer',
                              padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={15} color="#D1D1D6" strokeWidth={1.5} />
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

      {/* 确认删除弹窗 */}
      {confirmId && (
        <div
          onClick={closeConfirm}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-card)', borderRadius: 18,
              padding: '28px 24px 20px', width: '100%', maxWidth: 300,
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              确认删除
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 22 }}>
              删除后无法恢复
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={closeConfirm} disabled={deleting}>
                取消
              </button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function fmtDate(dateStr: string, today: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  if (dateStr === today) return '今天';
  const yesterday = (() => {
    const d = new Date(Date.now() - 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  if (dateStr === yesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
}
