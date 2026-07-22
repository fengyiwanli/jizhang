/**
 * 每日明细页面 — 独立全屏页面，含支出分类饼图
 */
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ArrowLeft, Zap } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import type { Category } from '@/domain/entities/Category';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

interface DailyTx {
  id: string; type: string; amount: number; time: string; note: string;
  categoryName: string; accountName: string;
}

interface Props { date: string; onBack: () => void; }

export default function DailyDetailPage({ date, onBack }: Props) {
  const [txs, setTxs] = useState<DailyTx[]>([]);
  const [loading, setLoading] = useState(true);
  const expensePieRef = useRef<HTMLDivElement>(null);
  const incomePieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = getAppContext();
    ctx.transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: date, dateTo: date, limit: 200 }).then((raw) => {
      const enriched = raw.map((tx) => {
        const cat = (ctx as any).categoryRepo?._cache?.find?.((c: Category) => c.id === tx.categoryId);
        const acc = (ctx as any).accountRepo?._cache?.find?.((a: any) => a.id === tx.accountId);
        return {
          id: tx.id, type: tx.type, amount: tx.amount,
          time: tx.time ?? '', note: tx.note ?? '',
          categoryName: cat?.name ?? (tx.type === 'expense' ? '支出' : tx.type === 'income' ? '收入' : '转账'),
          accountName: acc?.name ?? '',
        };
      });
      setTxs(enriched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  // 支出/收入分类聚合
  const expenseByCat = new Map<string, number>();
  const incomeByCat = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type === 'expense') {
      expenseByCat.set(tx.categoryName, (expenseByCat.get(tx.categoryName) ?? 0) + tx.amount);
    } else if (tx.type === 'income') {
      incomeByCat.set(tx.categoryName, (incomeByCat.get(tx.categoryName) ?? 0) + tx.amount);
    }
  }

  function makePieOption(data: [string, number][]) {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFF', borderColor: '#E8E8ED', borderWidth: 1,
        padding: [8, 12],
        textStyle: { fontSize: 13, color: '#1A1A2E', fontWeight: 500 },
        formatter: (p: { data: { name: string; value: number }; percent: number }) =>
          `<b>${p.data.name}</b> ${p.percent?.toFixed(1) ?? '0'}%<br/>¥${(p.data.value / 100).toFixed(2)}`,
      },
      legend: {
        type: 'scroll', orient: 'horizontal', bottom: 0, left: 'center',
        itemWidth: 8, itemHeight: 8, itemGap: 10,
        textStyle: { fontSize: 10, color: '#1A1A2E' },
        pageIconSize: 10,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '62%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 6 },
        data: data.map(([name, amount]) => ({ value: amount, name, itemStyle: { color: getCategoryColor(name) } })),
      }],
    };
  }

  // 支出饼图
  useEffect(() => {
    if (!expensePieRef.current || expenseByCat.size === 0) return;
    const chart = echarts.init(expensePieRef.current);
    chart.setOption(makePieOption(Array.from(expenseByCat.entries())) as any);
    return () => chart.dispose();
  }, [txs]);

  // 收入饼图
  useEffect(() => {
    if (!incomePieRef.current || incomeByCat.size === 0) return;
    const chart = echarts.init(incomePieRef.current);
    chart.setOption(makePieOption(Array.from(incomeByCat.entries())) as any);
    return () => chart.dispose();
  }, [txs]);

  const expenseTotal = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const incomeTotal = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const d = new Date(date + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const fmtDate = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 12px',
        background: '#F5F5F7', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 17, background: '#FFF',
          border: '1px solid #E8E8ED', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginRight: 10,
        }}>
          <ArrowLeft size={17} color="#1A1A2E" />
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', letterSpacing: -0.2 }}>{fmtDate}</div>
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 1 }}>{date}</div>
        </div>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 500, margin: '0 auto' }}>
        {/* Summary */}
        <div style={{
          display: 'flex', gap: 16, padding: '14px 16px',
          background: '#FFF', borderRadius: 14, marginBottom: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <SummaryBlock label="支出" value={expenseTotal} color="#E07B6C" />
          <div style={{ width: 1, background: '#F0F0F2' }} />
          <SummaryBlock label="收入" value={incomeTotal} color="#5FBB97" />
          <div style={{ width: 1, background: '#F0F0F2' }} />
          <SummaryBlock label="笔数" value={txs.length} color="#1A1A2E" isCount />
        </div>

        {/* 饼图 — 各占全宽 */}
        {!loading && expenseByCat.size > 0 && (
          <div style={{ background: '#FFF', borderRadius: 14, padding: '12px 12px 4px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E07B6C', marginBottom: 4, paddingLeft: 4 }}>支出构成</div>
            <div ref={expensePieRef} style={{ height: 220 }} />
          </div>
        )}
        {!loading && incomeByCat.size > 0 && (
          <div style={{ background: '#FFF', borderRadius: 14, padding: '12px 12px 4px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#5FBB97', marginBottom: 4, paddingLeft: 4 }}>收入构成</div>
            <div ref={incomePieRef} style={{ height: 220 }} />
          </div>
        )}

        {/* List */}
        {loading && <p style={{ textAlign: 'center', color: '#8E8E93', fontSize: 13, padding: 20 }}>加载中...</p>}
        {!loading && txs.length === 0 && (
          <p style={{ textAlign: 'center', color: '#8E8E93', fontSize: 13, padding: 30 }}>当天无交易</p>
        )}
        {txs.map((tx, i) => {
          const isExp = tx.type === 'expense';
          const IconComp = getCategoryIcon(tx.categoryName) ?? Zap;
          const color = getCategoryColor(tx.categoryName);
          return (
            <div key={tx.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0', borderBottom: i < txs.length - 1 ? '1px solid #F5F5F7' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: '#F5F5F7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconComp size={17} strokeWidth={1.8} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{tx.categoryName}</div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 1 }}>
                    {tx.time?.slice(0, 5)}{tx.note ? ` · ${tx.note}` : ''}{tx.accountName ? ` · ${tx.accountName}` : ''}
                  </div>
                </div>
              </div>
              <span style={{
                fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums',
                color: isExp ? '#E07B6C' : '#5FBB97',
              }}>
                {isExp ? '-' : '+'}¥{(tx.amount / 100).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryBlock({ label, value, color, isCount }: {
  label: string; value: number; color: string; isCount?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 11, color: '#8E8E93' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {isCount ? value : `¥${(value / 100).toFixed(2)}`}
      </div>
    </div>
  );
}
