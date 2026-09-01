/**
 * 统计分析页面
 *
 * 月统计: 收支总览 + 支出/收入分类饼图 + 每日趋势(可点击查看明细)
 * 年统计: 年度总览 + 月度柱状图 + 年度分类排名
 */
import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { Zap } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import type { MonthlySummary, CategoryStat, DailyTrend } from '@/data/repositories/StatsRepository';
import { MoneyUtils } from '@/core/types';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StatsPage({ onDayClick }: { onDayClick: (date: string) => void }) {
  // 视图模式: month / week / year / custom
  const [view, setView] = useState<'month' | 'week' | 'year' | 'custom'>('month');
  const [yearMonth, setYearMonth] = useState(getCurrentYM());
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // 月数据
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [expenseStats, setExpenseStats] = useState<CategoryStat[]>([]);
  const [incomeStats, setIncomeStats] = useState<CategoryStat[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [budget, setBudget] = useState<number | null>(null);

  // 年数据
  const [yearSummary, setYearSummary] = useState<MonthlySummary | null>(null);
  const [yearlyTrend, setYearlyTrend] = useState<Array<{ month: string; totalExpense: number; totalIncome: number }>>([]);
  const [yearlyExpense, setYearlyExpense] = useState<CategoryStat[]>([]);

  // 周数据
  const [weekData, setWeekData] = useState<{
    thisWeekExpense: number; thisWeekIncome: number;
    lastWeekExpense: number; lastWeekIncome: number; avgDaily: number;
  } | null>(null);

  // 自定义时间
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customData, setCustomData] = useState<{ expense: number; income: number; count: number } | null>(null);

  const [loading, setLoading] = useState(true);

  const expensePieRef = useRef<HTMLDivElement>(null);
  const incomePieRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'month') loadMonthData();
    else if (view === 'year') loadYearData();
    else if (view === 'week') loadWeekData();
    else loadCustomData();
  }, [yearMonth, year, view, customFrom, customTo]);

  async function loadMonthData() {
    setLoading(true);
    const { statsRepo, budgetRepo } = getAppContext();
    const [s, exp, inc, trend, budgetAmount] = await Promise.all([
      statsRepo.getMonthlySummary(yearMonth),
      statsRepo.getCategoryStats(yearMonth, 'expense'),
      statsRepo.getCategoryStats(yearMonth, 'income'),
      statsRepo.getDailyTrend(yearMonth),
      budgetRepo.getTotalBudget(yearMonth),
    ]);
    setSummary(s);
    setExpenseStats(exp);
    setIncomeStats(inc);
    setDailyTrend(trend);
    setBudget(budgetAmount !== null ? budgetAmount / 100 : null);
    setLoading(false);
  }

  async function loadYearData() {
    setLoading(true);
    const { statsRepo } = getAppContext();
    const [s, trend, exp] = await Promise.all([
      statsRepo.getYearlySummary(year),
      statsRepo.getYearlyTrend(year),
      statsRepo.getYearlyCategoryStats(year, 'expense'),
    ]);
    setYearSummary(s);
    setYearlyTrend(trend);
    setYearlyExpense(exp);
    setLoading(false);
  }

  async function loadWeekData() {
    setLoading(true);
    const { transactionRepo } = getAppContext();
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
    const lastSunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);

    const thisWeek = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: fmtDate(monday), dateTo: fmtDate(today), limit: 10000 });
    const lastWeek = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: fmtDate(lastMonday), dateTo: fmtDate(lastSunday), limit: 10000 });

    const sum = (txs: { type: string; amount: number }[], t: string) => txs.filter((x) => x.type === t).reduce((s, x) => s + x.amount, 0);
    const thisWeekExpense = sum(thisWeek, 'expense');
    const thisWeekIncome = sum(thisWeek, 'income');
    const lastWeekExpense = sum(lastWeek, 'expense');
    const lastWeekIncome = sum(lastWeek, 'income');
    const daysPassed = Math.max(1, Math.floor((today.getTime() - monday.getTime()) / 86400000) + 1);
    const avgDaily = thisWeekExpense / daysPassed;

    setWeekData({ thisWeekExpense, thisWeekIncome, lastWeekExpense, lastWeekIncome, avgDaily });
    setLoading(false);
  }

  async function loadCustomData() {
    if (!customFrom || !customTo) {
      setCustomData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: customFrom, dateTo: customTo, limit: 10000 });
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    setCustomData({ expense, income, count: txs.length });
    setLoading(false);
  }

  // 月支出饼图
  useEffect(() => {
    if (!expensePieRef.current || expenseStats.length === 0) return;
    const chart = echarts.init(expensePieRef.current);
    chart.setOption(pieOption(expenseStats, '支出'));
    return () => chart.dispose();
  }, [expenseStats]);

  // 月收入饼图
  useEffect(() => {
    if (!incomePieRef.current || incomeStats.length === 0) return;
    const chart = echarts.init(incomePieRef.current);
    chart.setOption(pieOption(incomeStats, '收入'));
    return () => chart.dispose();
  }, [incomeStats]);

  // 月趋势折线图
  useEffect(() => {
    if (!lineRef.current || dailyTrend.length === 0) return;
    const chart = echarts.init(lineRef.current);
    const days = dailyTrend.map((d) => d.date.slice(8));

    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { top: 8, left: 6, right: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: days, axisLabel: { fontSize: 10 }, axisTick: { show: false } },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: (v: number) => formatAxisLabel(v) },
        splitLine: { lineStyle: { color: '#F5F5F5' } },
      },
      series: [
        { name: '支出', type: 'bar', data: dailyTrend.map((d) => d.expense), itemStyle: { color: '#E07B6C', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
        { name: '收入', type: 'bar', data: dailyTrend.map((d) => d.income), itemStyle: { color: '#5FBB97', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
      ],
    });

    chart.on('click', (params: { name: string }) => {
      const idx = days.indexOf(params.name);
      if (idx >= 0) onDayClick(dailyTrend[idx]!.date);
    });

    return () => chart.dispose();
  }, [dailyTrend]);

  // 年柱状图
  useEffect(() => {
    if (!barRef.current || yearlyTrend.length === 0) return;
    const chart = echarts.init(barRef.current);
    const months = yearlyTrend.map((d) => d.month?.slice(5) ?? '');

    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['支出', '收入'], top: 0, textStyle: { fontSize: 11 } },
      grid: { top: 28, left: 6, right: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: (v: number) => formatAxisLabel(v) },
        splitLine: { lineStyle: { color: '#F5F5F5' } },
      },
      series: [
        { name: '支出', type: 'bar', data: yearlyTrend.map((d) => d.totalExpense), itemStyle: { color: '#E07B6C', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
        { name: '收入', type: 'bar', data: yearlyTrend.map((d) => d.totalIncome), itemStyle: { color: '#5FBB97', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
      ],
    });

    chart.on('click', (params: { name: string }) => {
      const idx = months.indexOf(params.name);
      if (idx >= 0) {
        setYearMonth(`${year}-${yearlyTrend[idx]!.month?.slice(5)}`);
        setView('month');
      }
    });

    return () => chart.dispose();
  }, [yearlyTrend]);

  const change = (delta: number) => {
    if (view === 'month') {
      const [y, m] = yearMonth.split('-').map(Number);
      const d = new Date(y!, m! - 1);
      d.setMonth(d.getMonth() + delta);
      setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    } else if (view === 'year') {
      setYear(String(Number(year) + delta));
    }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>加载中...</p>;

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      {/* 视图切换 + 时间选择 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: '#F5F5F7', borderRadius: 10, padding: 3 }}>
          {([
            { v: 'month', label: '月' },
            { v: 'week', label: '周' },
            { v: 'year', label: '年' },
            { v: 'custom', label: '自定义' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 12px', border: 'none', borderRadius: 8,
              background: view === v ? '#FFF' : 'transparent',
              fontWeight: view === v ? 600 : 400, fontSize: 13,
              color: view === v ? '#1A1A2E' : '#8E8E93',
              cursor: 'pointer', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 200ms', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(view === 'month' || view === 'year') && (
            <>
              <button onClick={() => change(-1)} style={navBtn}>{'‹'}</button>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E', minWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view === 'month' ? yearMonth.replace('-', '年') + '月' : year + '年'}
              </span>
              <button onClick={() => change(1)} style={navBtn}>{'›'}</button>
            </>
          )}
          {view === 'week' && <span style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>本周</span>}
        </div>
      </div>

      {/* 自定义时间范围选择 */}
      {view === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, background: '#FFF', borderRadius: 12, padding: '10px 12px' }}>
          <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} style={{ flex: 1, border: 'none', background: '#F5F5F7', borderRadius: 8, padding: '8px', fontSize: 13, color: '#1A1A2E', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 12, color: '#8E8E93' }}>至</span>
          <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} style={{ flex: 1, border: 'none', background: '#F5F5F7', borderRadius: 8, padding: '8px', fontSize: 13, color: '#1A1A2E', fontFamily: 'inherit' }} />
        </div>
      )}

      {/* 周视图 */}
      {view === 'week' && weekData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Card label="本周支出" value={MoneyUtils.format(weekData.thisWeekExpense)} color="#FF6B6B" />
            <Card label="本周收入" value={MoneyUtils.format(weekData.thisWeekIncome)} color="#2ECC71" />
            <Card label="日均支出" value={MoneyUtils.format(Math.round(weekData.avgDaily))} color="#4ECDC4" />
          </div>
          <WeekCompare
            thisWeekExpense={weekData.thisWeekExpense}
            lastWeekExpense={weekData.lastWeekExpense}
            thisWeekIncome={weekData.thisWeekIncome}
            lastWeekIncome={weekData.lastWeekIncome}
          />
        </>
      )}

      {/* 自定义视图 */}
      {view === 'custom' && customData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Card label="支出" value={MoneyUtils.format(customData.expense)} color="#FF6B6B" />
          <Card label="收入" value={MoneyUtils.format(customData.income)} color="#2ECC71" />
          <Card label="结余" value={MoneyUtils.format(customData.income - customData.expense)} color={customData.income >= customData.expense ? '#4ECDC4' : '#E07B6C'} />
        </div>
      )}
      {view === 'custom' && !customData && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>
          <div style={{ fontSize: 36 }}>📅</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>选择起止日期查看统计</div>
        </div>
      )}

      {/* 通用总览卡 */}
      {view === 'month' && summary && (
        <>
          {/* 预算 vs 实际 */}
          {budget !== null && budget > 0 && (
            <BudgetCompare spent={summary.totalExpense} budget={Math.round(budget * 100)} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Card label="支出" value={MoneyUtils.format(summary.totalExpense)} color="#FF6B6B" />
            <Card label="收入" value={MoneyUtils.format(summary.totalIncome)} color="#2ECC71" />
            <Card label="结余" value={MoneyUtils.format(summary.totalIncome - summary.totalExpense)} color={summary.totalIncome >= summary.totalExpense ? '#4ECDC4' : '#E07B6C'} />
          </div>
        </>
      )}

      {view === 'year' && yearSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Card label="年支出" value={MoneyUtils.format(yearSummary.totalExpense)} color="#FF6B6B" />
          <Card label="年收入" value={MoneyUtils.format(yearSummary.totalIncome)} color="#2ECC71" />
          <Card label="年结余" value={MoneyUtils.format(yearSummary.totalIncome - yearSummary.totalExpense)} color={yearSummary.totalIncome >= yearSummary.totalExpense ? '#4ECDC4' : '#E07B6C'} />
        </div>
      )}

      {view === 'month' && (
        <>
          {/* 饼图 — 各占全宽 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {expenseStats.length > 0 && (
              <ChartCard title="支出分类"><div ref={expensePieRef} style={{ height: 250 }} /></ChartCard>
            )}
            {incomeStats.length > 0 && (
              <ChartCard title="收入分类"><div ref={incomePieRef} style={{ height: 250 }} /></ChartCard>
            )}
          </div>
          {expenseStats.length === 0 && incomeStats.length === 0 && (
            <EmptyHint />
          )}

          {/* 排行榜 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <RankList title="支出排行" stats={expenseStats} />
            <RankList title="收入排行" stats={incomeStats} />
          </div>

          {/* 每日趋势 */}
          {dailyTrend.length > 0 && (
            <ChartCard title="每日趋势 (点击查看明细)">
              <div ref={lineRef} style={{ height: 180 }} />
            </ChartCard>
          )}
        </>
      )}

      {view === 'year' && (
        <>
          {/* 月度柱状图 */}
          {yearlyTrend.length > 0 && (
            <ChartCard title="月度收支 (点击月份查看详情)">
              <div ref={barRef} style={{ height: 220 }} />
            </ChartCard>
          )}

          {/* 年度分类排名 */}
          {yearlyExpense.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <RankList title="年度支出排行" stats={yearlyExpense} full />
            </div>
          )}
          {yearlyTrend.length === 0 && <EmptyHint />}
        </>
      )}
    </div>
  );
}

// --- 子组件 ---

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: '#1A1A2E', marginBottom: 8, fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 6px', background: '#FFF', borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}`, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, color: '#8E8E93' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function WeekCompare({ thisWeekExpense, lastWeekExpense, thisWeekIncome, lastWeekIncome }: {
  thisWeekExpense: number; lastWeekExpense: number;
  thisWeekIncome: number; lastWeekIncome: number;
}) {
  const expenseDiff = thisWeekExpense - lastWeekExpense;
  const expensePct = lastWeekExpense > 0 ? Math.round((expenseDiff / lastWeekExpense) * 100) : 0;
  const incomeDiff = thisWeekIncome - lastWeekIncome;
  const incomePct = lastWeekIncome > 0 ? Math.round((incomeDiff / lastWeekIncome) * 100) : 0;
  const diffColor = (v: number) => (v > 0 ? '#E07B6C' : v < 0 ? '#5FBB97' : '#8E8E93');

  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: '14px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>环比上周</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#8E8E93' }}>支出</div>
          <div style={{ fontSize: 13, marginTop: 2, color: diffColor(expenseDiff), fontWeight: 600 }}>
            {expenseDiff > 0 ? '+' : ''}{expenseDiff === 0 ? '持平' : `${MoneyUtils.format(expenseDiff).replace('¥', '')} (${expenseDiff > 0 ? '+' : ''}${expensePct}%)`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8E8E93' }}>收入</div>
          <div style={{ fontSize: 13, marginTop: 2, color: diffColor(incomeDiff), fontWeight: 600 }}>
            {incomeDiff > 0 ? '+' : ''}{incomeDiff === 0 ? '持平' : `${MoneyUtils.format(incomeDiff).replace('¥', '')} (${incomeDiff > 0 ? '+' : ''}${incomePct}%)`}
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetCompare({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const remain = budget - spent;
  const color = pct < 80 ? '#4ECDC4' : pct <= 100 ? '#FF9F43' : '#E07B6C';
  const overSpent = remain < 0;
  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: '12px 14px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>本月预算 vs 实际</span>
        <span style={{ fontSize: 12, color }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#F0F0F2', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 300ms ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span style={{ color: '#8E8E93' }}>支出 <span style={{ color: color, fontWeight: 600 }}>¥{(spent / 100).toFixed(2)}</span> / ¥{(budget / 100).toFixed(2)}</span>
        <span style={{ color: overSpent ? '#E07B6C' : '#8E8E93', fontWeight: overSpent ? 600 : 400 }}>
          {overSpent ? `超支 ¥${(-remain / 100).toFixed(2)}` : `剩余 ¥${(remain / 100).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

function RankList({ title, stats, full }: { title: string; stats: CategoryStat[]; full?: boolean }) {
  const list = full ? stats : stats.slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: '#1A1A2E', marginBottom: 8, fontWeight: 600 }}>{title}</h3>
      {list.map((c, i) => {
        const IconComp = getCategoryIcon(c.categoryName) ?? Zap;
        const color = c.categoryColor || getCategoryColor(c.categoryName);
        return (
          <div key={c.categoryId} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: i < list.length - 1 ? '1px solid #F5F5F7' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ color: '#B0B0B0', width: 14, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: '#F5F5F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IconComp size={14} strokeWidth={1.8} color={color} />
              </div>
              <span style={{ fontSize: 12, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.categoryName}</span>
            </div>
            <span style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              ¥{(c.amount / 100).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyHint() {
  return <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}><div style={{ fontSize: 40, marginBottom: 8 }}>📊</div><div>暂无数据</div></div>;
}

function getCurrentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 格式化图表 y 轴金额 (单位: 分) */
function formatAxisLabel(v: number): string {
  const yuan = Math.abs(v) / 100;
  if (yuan >= 10000) return `¥${(yuan / 10000).toFixed(1)}万`;
  if (yuan >= 1000) return `¥${(yuan / 1000).toFixed(1)}k`;
  return `¥${yuan.toFixed(0)}`;
}

function pieOption(stats: CategoryStat[], _label: string) {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#FFF',
      borderColor: '#E8E8ED',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { fontSize: 13, color: '#1A1A2E', fontWeight: 500 },
      formatter: (p: { data: { name: string; value: number }; percent: number }) => {
        const pct = p.percent != null ? ` ${p.percent.toFixed(1)}%` : '';
        return `<b>${p.data.name}</b>${pct}<br/>¥${(p.data.value / 100).toFixed(2)}`;
      },
    },
    // 图例：底部横向滚动，自适应换行
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10,
      textStyle: { fontSize: 11, color: '#1A1A2E' },
      pageButtonItemGap: 2,
      pageButtonPosition: 'end',
      pageIconSize: 10,
      pageTextStyle: { fontSize: 10, color: '#8E8E93' },
    },
    series: [{
      type: 'pie',
      // 图例使用 scroll 模式，移动端可左右滑动
      radius: ['42%', '62%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 1 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 15, fontWeight: 'bold' },
        scaleSize: 8,
      },
      data: stats.map((c) => ({
        value: c.amount,
        name: c.categoryName,
        itemStyle: { color: c.categoryColor },
      })),
    }],
  };
}

const navBtn: React.CSSProperties = {
  width: 32, height: 32, border: 'none', borderRadius: 16,
  background: '#F5F5F7', color: '#1A1A2E', fontSize: 18,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
