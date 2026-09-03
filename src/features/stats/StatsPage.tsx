/**
 * 统计分析页面
 *
 * 视图: 日 / 周 / 月 / 年 / 自定义
 * - 视图统一布局：收支总览(支出/收入/结余) + 收入/支出构成(CategoryBars) + 环比 + 趋势；点击构成分类查看分类账单详情（长按条目可编辑/删除）
 * - 日视图: 日期导航 + 收支总览 + 当天分类构成 + 当天明细
 * - 年视图: 年度总览 + 构成 + 环比 + 月度柱状图
 */
import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { BarChart3, ArrowLeft, ArrowLeftRight, Calendar } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { useCategoryStore } from '@/features/category/store';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import TxDeleteButton from '@/shared/components/TxDeleteButton';
import TransactionEditSheet from '@/shared/components/TransactionEditSheet';
import useRowLongPress from '@/shared/hooks/useRowLongPress';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import type { Transaction } from '@/domain/entities/Transaction';
import { getCategoryColor, tintColor, resolveCategoryIcon } from '@/shared/components/CategoryIcons';
import type { StatsRepository, MonthlySummary, CategoryStat, DailyTrend } from '@/data/repositories/StatsRepository';
import { MoneyUtils } from '@/core/types';
import { todayLocal } from '@/core/datetime';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'custom';

/** getDailyTransactions 返回的完整行数组 */
type DayTxList = Awaited<ReturnType<StatsRepository['getDailyTransactions']>>;

/* ECharts 是 canvas 渲染，不支持 CSS 变量；这里统一取 global.css token 的落地 hex（唯一来源） */
const CHART_EXPENSE = '#E07B6C'; // = var(--color-expense)
const CHART_INCOME = '#5FBB97';  // = var(--color-income)
const CHART_TEXT = '#1A1A2E';    // 文字/图例
const CHART_MUTED = '#8E8E93';   // 次要
const CHART_GRID = '#F5F5F5';    // 分割线

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StatsPage() {
  const [view, setView] = useState<ViewMode>('month');
  const [yearMonth, setYearMonth] = useState(getCurrentYM());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [day, setDay] = useState(todayLocal());

  // 月数据
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [prevMonthSummary, setPrevMonthSummary] = useState<MonthlySummary | null>(null);
  const [expenseStats, setExpenseStats] = useState<CategoryStat[]>([]);
  const [incomeStats, setIncomeStats] = useState<CategoryStat[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);      // 原始（有记录日期）
  const [monthTrend, setMonthTrend] = useState<DailyTrend[]>([]);      // 补齐整月 1..N 号
  const [budget, setBudget] = useState<number | null>(null);

  // 年数据
  const [yearSummary, setYearSummary] = useState<MonthlySummary | null>(null);
  const [prevYearSummary, setPrevYearSummary] = useState<MonthlySummary | null>(null);
  const [yearlyTrend, setYearlyTrend] = useState<Array<{ month: string; totalExpense: number; totalIncome: number }>>([]);
  const [yearlyExpense, setYearlyExpense] = useState<CategoryStat[]>([]);
  const [yearlyIncome, setYearlyIncome] = useState<CategoryStat[]>([]);

  // 周数据
  const [weekData, setWeekData] = useState<{
    thisWeekExpense: number; thisWeekIncome: number;
    lastWeekExpense: number; lastWeekIncome: number; avgDaily: number;
  } | null>(null);
  const [weekDaily, setWeekDaily] = useState<DailyTrend[]>([]);        // 本周 7 天（已补齐）
  const [weekExpenseStats, setWeekExpenseStats] = useState<CategoryStat[]>([]);
  const [weekIncomeStats, setWeekIncomeStats] = useState<CategoryStat[]>([]);

  // 自定义时间
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customData, setCustomData] = useState<{ expense: number; income: number; count: number } | null>(null);

  // 日数据
  const [daySummary, setDaySummary] = useState<{ expense: number; income: number; count: number } | null>(null);
  const [dayExpenseStats, setDayExpenseStats] = useState<CategoryStat[]>([]);
  const [dayIncomeStats, setDayIncomeStats] = useState<CategoryStat[]>([]);
  const [dayTxs, setDayTxs] = useState<DayTxList>([]);
  // 分类账单详情弹层
  const [drill, setDrill] = useState<{ from: string; to: string; cat: CategoryStat } | null>(null);
  // 日视图编辑
  const [editingDay, setEditingDay] = useState<Transaction | null>(null);

  const [loading, setLoading] = useState(true);

  const lineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const weekBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'month') loadMonthData();
    else if (view === 'year') loadYearData();
    else if (view === 'week') loadWeekData();
    else if (view === 'day') loadDayData();
    else loadCustomData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth, year, view, customFrom, customTo, day]);

  async function loadMonthData() {
    setLoading(true);
    const { statsRepo, budgetRepo } = getAppContext();
    const prevYM = shiftYM(yearMonth, -1);
    const [s, prev, exp, inc, trend, budgetAmount] = await Promise.all([
      statsRepo.getMonthlySummary(yearMonth),
      statsRepo.getMonthlySummary(prevYM),
      statsRepo.getCategoryStats(yearMonth, 'expense'),
      statsRepo.getCategoryStats(yearMonth, 'income'),
      statsRepo.getDailyTrend(yearMonth),
      budgetRepo.getTotalBudget(yearMonth),
    ]);
    setSummary(s);
    setPrevMonthSummary(prev);
    setExpenseStats(exp);
    setIncomeStats(inc);
    setDailyTrend(trend);
    setMonthTrend(padMonthTrend(trend, yearMonth));
    setBudget(budgetAmount !== null ? budgetAmount / 100 : null);
    setLoading(false);
  }

  async function loadYearData() {
    setLoading(true);
    const { statsRepo } = getAppContext();
    const prevYear = String(Number(year) - 1);
    const [s, prev, trend, exp, inc] = await Promise.all([
      statsRepo.getYearlySummary(year),
      statsRepo.getYearlySummary(prevYear),
      statsRepo.getYearlyTrend(year),
      statsRepo.getYearlyCategoryStats(year, 'expense'),
      statsRepo.getYearlyCategoryStats(year, 'income'),
    ]);
    setYearSummary(s);
    setPrevYearSummary(prev);
    setYearlyTrend(trend);
    setYearlyExpense(exp);
    setYearlyIncome(inc);
    setLoading(false);
  }

  async function loadWeekData() {
    setLoading(true);
    const { statsRepo } = getAppContext();
    const today = new Date();
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
    const lastSunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const [thisWeek, lastWeek, weekRange, wExp, wInc] = await Promise.all([
      statsRepo.getWeekSummary(fmtDate(monday), fmtDate(today)),
      statsRepo.getWeekSummary(fmtDate(lastMonday), fmtDate(lastSunday)),
      statsRepo.getDailyTrendRange(fmtDate(monday), fmtDate(sunday)),
      statsRepo.getRangeCategoryStats(fmtDate(monday), fmtDate(sunday), 'expense'),
      statsRepo.getRangeCategoryStats(fmtDate(monday), fmtDate(sunday), 'income'),
    ]);

    const thisWeekExpense = thisWeek.expense;
    const thisWeekIncome = thisWeek.income;
    const lastWeekExpense = lastWeek.expense;
    const lastWeekIncome = lastWeek.income;
    const daysPassed = Math.max(1, Math.floor((today.getTime() - monday.getTime()) / 86400000) + 1);
    const avgDaily = thisWeekExpense / daysPassed;

    setWeekData({ thisWeekExpense, thisWeekIncome, lastWeekExpense, lastWeekIncome, avgDaily });
    setWeekDaily(padWeekDays(weekRange, monday));
    setWeekExpenseStats(wExp);
    setWeekIncomeStats(wInc);
    setLoading(false);
  }

  async function loadCustomData() {
    if (!customFrom || !customTo) {
      setCustomData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { statsRepo } = getAppContext();
    const data = await statsRepo.getCustomSummary(customFrom, customTo);
    setCustomData({ expense: data.expense, income: data.income, count: data.count });
    setLoading(false);
  }

  async function loadDayData() {
    setLoading(true);
    const { statsRepo } = getAppContext();
    const [sum, exp, inc, txs] = await Promise.all([
      statsRepo.getRangeSummary(day, day),
      statsRepo.getRangeCategoryStats(day, day, 'expense'),
      statsRepo.getRangeCategoryStats(day, day, 'income'),
      statsRepo.getDailyTransactions(day),
    ]);
    setDaySummary(sum);
    setDayExpenseStats(exp);
    setDayIncomeStats(inc);
    setDayTxs(txs);
    setLoading(false);
  }

  /** 删除当日某条记录并刷新日视图 */
  async function handleDayDelete(id: string) {
    try {
      await useTransactionStore.getState().deleteTransaction(id);
      useToast.getState().success('已删除');
      loadDayData();
    } catch {
      useToast.getState().error('删除失败');
    }
  }

  /** 日视图长按编辑：按 id 取完整交易实体再打开编辑弹层 */
  async function openDayEdit(id: string) {
    try {
      const full = await getAppContext().transactionRepo.getById(id);
      if (full) setEditingDay(full);
    } catch { /* ignore */ }
  }

  // 月趋势柱状图（补齐整月日期，点击切日视图）
  useEffect(() => {
    if (!lineRef.current || monthTrend.length === 0) return;
    const chart = echarts.init(lineRef.current);
    const days = monthTrend.map((d) => d.date.slice(8));

    chart.setOption({
      tooltip: axisTooltip(),
      grid: { top: 8, left: 6, right: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: days, axisLabel: { fontSize: 10, color: CHART_MUTED }, axisTick: { show: false } },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: CHART_MUTED, formatter: (v: number) => formatAxisLabel(v) },
        splitLine: { lineStyle: { color: CHART_GRID } },
      },
      series: [
        { name: '支出', type: 'bar', data: monthTrend.map((d) => d.expense), itemStyle: { color: CHART_EXPENSE, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
        { name: '收入', type: 'bar', data: monthTrend.map((d) => d.income), itemStyle: { color: CHART_INCOME, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
      ],
    });

    return () => chart.dispose();
  }, [monthTrend]);

  // 年柱状图
  useEffect(() => {
    if (!barRef.current || yearlyTrend.length === 0) return;
    const chart = echarts.init(barRef.current);
    const months = yearlyTrend.map((d) => d.month?.slice(5) ?? '');

    chart.setOption({
      tooltip: axisTooltip(),
      legend: { data: ['支出', '收入'], top: 0, textStyle: { fontSize: 11, color: CHART_TEXT } },
      grid: { top: 28, left: 6, right: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10, color: CHART_MUTED } },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: CHART_MUTED, formatter: (v: number) => formatAxisLabel(v) },
        splitLine: { lineStyle: { color: CHART_GRID } },
      },
      series: [
        { name: '支出', type: 'bar', data: yearlyTrend.map((d) => d.totalExpense), itemStyle: { color: CHART_EXPENSE, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
        { name: '收入', type: 'bar', data: yearlyTrend.map((d) => d.totalIncome), itemStyle: { color: CHART_INCOME, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
      ],
    });

    return () => chart.dispose();
  }, [yearlyTrend]);

  // 周视图「本周每日收支」柱状图
  useEffect(() => {
    if (!weekBarRef.current || weekDaily.length === 0) return;
    const chart = echarts.init(weekBarRef.current);
    const labels = weekDaily.map((_, i) => WEEK_LABELS[i] ?? '');

    chart.setOption({
      tooltip: axisTooltip(),
      grid: { top: 8, left: 6, right: 6, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: CHART_MUTED }, axisTick: { show: false } },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: CHART_MUTED, formatter: (v: number) => formatAxisLabel(v) },
        splitLine: { lineStyle: { color: CHART_GRID } },
      },
      series: [
        { name: '支出', type: 'bar', data: weekDaily.map((d) => d.expense), itemStyle: { color: CHART_EXPENSE, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 14 },
        { name: '收入', type: 'bar', data: weekDaily.map((d) => d.income), itemStyle: { color: CHART_INCOME, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 14 },
      ],
    });

    return () => chart.dispose();
  }, [weekDaily]);

  const changePeriod = (delta: number) => {
    if (view === 'month') {
      const [y, m] = yearMonth.split('-').map(Number);
      const d = new Date(y!, m! - 1);
      d.setMonth(d.getMonth() + delta);
      setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    } else if (view === 'year') {
      setYear(String(Number(year) + delta));
    }
  };

  const shiftDay = (delta: number) => {
    const d = new Date(day + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const nd = fmtDate(d);
    if (nd <= todayLocal()) setDay(nd);
  };

  const isToday = day === todayLocal();
  const dayLabel = (() => {
    const d = new Date(day + 'T00:00:00');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const yesterday = (() => {
      const yd = new Date(Date.now() - 86400000);
      return fmtDate(yd);
    })();
    let head = `${d.getMonth() + 1}月${d.getDate()}日`;
    if (day === todayLocal()) head = '今天';
    else if (day === yesterday) head = '昨天';
    return `${head} · 周${weekdays[d.getDay()]}`;
  })();

  if (loading) return <StatsSkeleton />;

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      {/* 视图切换 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: view === 'day' ? 8 : 16 }}>
        <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 3, flexShrink: 0, maxWidth: '100%' }}>
          {([
            { v: 'day', label: '日' },
            { v: 'week', label: '周' },
            { v: 'month', label: '月' },
            { v: 'year', label: '年' },
            { v: 'custom', label: '自定义' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 10px', border: 'none', borderRadius: 8,
              background: view === v ? 'var(--color-card)' : 'transparent',
              fontWeight: view === v ? 600 : 400, fontSize: 12,
              color: view === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 200ms', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* 顶行右侧：月/年 ‹ › 或 周 占位（日视图的日期导航单独放第二行） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {(view === 'month' || view === 'year') && (
            <>
              <button onClick={() => changePeriod(-1)} style={navBtn}>{'‹'}</button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', minWidth: 72, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view === 'month' ? yearMonth.replace('-', '年') + '月' : year + '年'}
              </span>
              <button onClick={() => changePeriod(1)} style={navBtn}>{'›'}</button>
            </>
          )}
          {view === 'week' && <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>本周</span>}
        </div>
      </div>

      {/* 日视图专属日期导航：独立一行，左右翻天 + 中间日期 + 右侧选日期胶囊（不越界） */}
      {view === 'day' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={() => shiftDay(-1)} style={navBtn}>{'‹'}</button>
          <span style={{
            flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)',
            textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {dayLabel}
          </span>
          <button onClick={() => shiftDay(1)} disabled={isToday} style={{ ...navBtn, opacity: isToday ? 0.3 : 1 }}>{'›'}</button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '7px 10px', borderRadius: 14,
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              fontSize: 12, fontWeight: 500,
            }}>
              <Calendar size={13} />
              选日期
            </div>
            <input
              type="date"
              value={day}
              max={todayLocal()}
              onChange={(e) => e.target.value && setDay(e.target.value)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* 自定义时间范围选择 */}
      {view === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, background: 'var(--color-card)', borderRadius: 12, padding: '10px 12px' }}>
          <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} style={{ flex: 1, border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '8px', fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>至</span>
          <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} style={{ flex: 1, border: 'none', background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '8px', fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
        </div>
      )}

      {/* 日视图 */}
      {view === 'day' && daySummary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Card label="支出" value={MoneyUtils.format(daySummary.expense)} color="var(--color-expense)" />
            <Card label="收入" value={MoneyUtils.format(daySummary.income)} color="var(--color-income)" />
            <Card label="结余" value={MoneyUtils.format(daySummary.income - daySummary.expense)} color={daySummary.income >= daySummary.expense ? 'var(--color-primary)' : 'var(--color-expense)'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {dayExpenseStats.length > 0 && (
              <CategoryBars title="支出构成" stats={dayExpenseStats} accent="expense"
                onRowClick={(c) => setDrill({ from: day, to: day, cat: c })} />
            )}
            {dayIncomeStats.length > 0 && (
              <CategoryBars title="收入构成" stats={dayIncomeStats} accent="income"
                onRowClick={(c) => setDrill({ from: day, to: day, cat: c })} />
            )}
          </div>

          {/* 当天明细 */}
          <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>明细</div>
            {dayTxs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-text-tertiary)' }}>
                <div style={{ fontSize: 13 }}>{isToday ? '今天还没有记账' : '这一天还没有记录'}</div>
              </div>
            )}
            {dayTxs.map((tx, i) => (
              <DayTxRow key={tx.id} tx={tx} last={i === dayTxs.length - 1}
                onDelete={() => handleDayDelete(tx.id)}
                onEdit={() => openDayEdit(tx.id)} />
            ))}
          </div>
        </>
      )}
      {view === 'day' && !daySummary && !loading && <EmptyHint />}

      {/* 周视图（与月同构：总览 → 构成 → 环比 → 每日收支） */}
      {view === 'week' && weekData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Card label="支出" value={MoneyUtils.format(weekData.thisWeekExpense)} color="var(--color-expense)" />
            <Card label="收入" value={MoneyUtils.format(weekData.thisWeekIncome)} color="var(--color-income)" />
            <Card label="结余" value={MoneyUtils.format(weekData.thisWeekIncome - weekData.thisWeekExpense)} color={weekData.thisWeekIncome >= weekData.thisWeekExpense ? 'var(--color-primary)' : 'var(--color-expense)'} />
          </div>

          {weekDaily.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {weekExpenseStats.length > 0 && (
                <CategoryBars title="支出构成" stats={weekExpenseStats} accent="expense"
                  onRowClick={(c) => setDrill({ from: weekDaily[0]!.date, to: weekDaily[weekDaily.length - 1]!.date, cat: c })} />
              )}
              {weekIncomeStats.length > 0 && (
                <CategoryBars title="收入构成" stats={weekIncomeStats} accent="income"
                  onRowClick={(c) => setDrill({ from: weekDaily[0]!.date, to: weekDaily[weekDaily.length - 1]!.date, cat: c })} />
              )}
            </div>
          )}

          <CompareCard
            title="环比上周"
            expenseNow={weekData.thisWeekExpense}
            expensePrev={weekData.lastWeekExpense}
            incomeNow={weekData.thisWeekIncome}
            incomePrev={weekData.lastWeekIncome}
          />
          {weekDaily.length > 0 && (
            <ChartCard title="本周每日收支">
              <div ref={weekBarRef} style={{ height: 170 }} />
            </ChartCard>
          )}
        </>
      )}

      {/* 自定义视图 */}
      {view === 'custom' && customData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Card label="支出" value={MoneyUtils.format(customData.expense)} color="var(--color-expense)" />
          <Card label="收入" value={MoneyUtils.format(customData.income)} color="var(--color-income)" />
          <Card label="结余" value={MoneyUtils.format(customData.income - customData.expense)} color={customData.income >= customData.expense ? 'var(--color-primary)' : 'var(--color-expense)'} />
        </div>
      )}
      {view === 'custom' && !customData && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
          <Calendar size={40} strokeWidth={1.2} color="#C7C7CC" />
          <div style={{ marginTop: 8, fontSize: 13 }}>选择起止日期查看统计</div>
        </div>
      )}

      {/* 月视图：总览 + 分类构成 + 每日趋势 */}
      {view === 'month' && summary && (
        <>
          {budget !== null && budget > 0 && (
            <BudgetCompare spent={summary.totalExpense} budget={Math.round(budget * 100)} />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Card label="支出" value={MoneyUtils.format(summary.totalExpense)} color="var(--color-expense)" />
            <Card label="收入" value={MoneyUtils.format(summary.totalIncome)} color="var(--color-income)" />
            <Card label="结余" value={MoneyUtils.format(summary.totalIncome - summary.totalExpense)} color={summary.totalIncome >= summary.totalExpense ? 'var(--color-primary)' : 'var(--color-expense)'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {expenseStats.length > 0 && (
              <CategoryBars title="支出构成" stats={expenseStats} accent="expense"
                onRowClick={(c) => setDrill({ from: `${yearMonth}-01`, to: endOfMonth(yearMonth), cat: c })} />
            )}
            {incomeStats.length > 0 && (
              <CategoryBars title="收入构成" stats={incomeStats} accent="income"
                onRowClick={(c) => setDrill({ from: `${yearMonth}-01`, to: endOfMonth(yearMonth), cat: c })} />
            )}
          </div>

          {prevMonthSummary && (
            <div style={{ marginBottom: 12 }}>
              <CompareCard
                title="环比上月"
                expenseNow={summary.totalExpense}
                expensePrev={prevMonthSummary.totalExpense}
                incomeNow={summary.totalIncome}
                incomePrev={prevMonthSummary.totalIncome}
              />
            </div>
          )}
          {expenseStats.length === 0 && incomeStats.length === 0 && <EmptyHint />}

          {dailyTrend.length > 0 && (
            <ChartCard title="每日趋势">
              <div ref={lineRef} style={{ height: 180 }} />
            </ChartCard>
          )}
        </>
      )}

      {/* 年视图（与月同构：总览 → 构成 → 环比 → 月度收支） */}
      {view === 'year' && yearSummary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Card label="支出" value={MoneyUtils.format(yearSummary.totalExpense)} color="var(--color-expense)" />
            <Card label="收入" value={MoneyUtils.format(yearSummary.totalIncome)} color="var(--color-income)" />
            <Card label="结余" value={MoneyUtils.format(yearSummary.totalIncome - yearSummary.totalExpense)} color={yearSummary.totalIncome >= yearSummary.totalExpense ? 'var(--color-primary)' : 'var(--color-expense)'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {yearlyExpense.length > 0 && (
              <CategoryBars title="支出构成" stats={yearlyExpense} accent="expense"
                onRowClick={(c) => setDrill({ from: `${year}-01-01`, to: `${year}-12-31`, cat: c })} />
            )}
            {yearlyIncome.length > 0 && (
              <CategoryBars title="收入构成" stats={yearlyIncome} accent="income"
                onRowClick={(c) => setDrill({ from: `${year}-01-01`, to: `${year}-12-31`, cat: c })} />
            )}
          </div>

          {prevYearSummary && (
            <div style={{ marginBottom: 12 }}>
              <CompareCard
                title="环比上年"
                expenseNow={yearSummary.totalExpense}
                expensePrev={prevYearSummary.totalExpense}
                incomeNow={yearSummary.totalIncome}
                incomePrev={prevYearSummary.totalIncome}
              />
            </div>
          )}

          {yearlyTrend.length > 0 && (
            <ChartCard title="月度收支">
              <div ref={barRef} style={{ height: 220 }} />
            </ChartCard>
          )}
          {yearlyTrend.length === 0 && yearlyExpense.length === 0 && yearlyIncome.length === 0 && <EmptyHint />}
        </>
      )}

      {/* 分类账单详情（点击构成条目弹出） */}
      {drill && <CategoryDrillOverlay from={drill.from} to={drill.to} cat={drill.cat} onClose={() => setDrill(null)} />}
      {editingDay && (
        <TransactionEditSheet
          tx={editingDay}
          onClose={() => setEditingDay(null)}
          onSaved={() => { setEditingDay(null); loadDayData(); }}
        />
      )}
    </div>
  );
}

// --- 子组件 ---

/** 分类构成卡片：份额堆叠条 + 排行（前 5 + 展开）；onRowClick 点击分类看账单明细 */
function CategoryBars({ title, stats, accent, onRowClick }: {
  title: string; stats: CategoryStat[]; accent: 'expense' | 'income';
  onRowClick?: (c: CategoryStat) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const tone = accent === 'expense' ? 'var(--color-expense)' : 'var(--color-income)';
  const sign = accent === 'expense' ? '-' : '+';
  const total = stats.reduce((s, c) => s + c.amount, 0);
  if (total <= 0 || stats.length === 0) return null;

  const list = showAll ? stats : stats.slice(0, 5);
  const hidden = stats.length - list.length;

  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: tone, fontVariantNumeric: 'tabular-nums' }}>{MoneyUtils.format(total)}</span>
      </div>

      {/* 份额堆叠条 */}
      <div style={{ display: 'flex', gap: 2, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
        {stats.map((c) => (
          <div
            key={c.categoryId}
            style={{ flexBasis: `${(c.amount / total) * 100}%`, background: c.categoryColor, minWidth: 1 }}
          />
        ))}
      </div>

      {/* 排行明细 */}
      {list.map((c, i) => {
        const IconComp = resolveCategoryIcon({ icon: c.categoryIcon ?? null, name: c.categoryName });
        const pct = Math.round((c.amount / total) * 100);
        return (
          <div
            key={c.categoryId}
            className="row-press"
            onClick={() => onRowClick?.(c)}
            role={onRowClick ? 'button' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0', borderBottom: i < list.length - 1 ? '0.5px solid var(--color-divider)' : 'none',
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            <span style={{ color: 'var(--color-text-tertiary)', width: 14, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: tintColor(c.categoryColor),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconComp size={14} strokeWidth={1.8} color={c.categoryColor} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.categoryName}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: tone, fontVariantNumeric: 'tabular-nums' }}>
              {sign}¥{(c.amount / 100).toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: 40, textAlign: 'right', flexShrink: 0 }}>
              {pct}%
            </span>
          </div>
        );
      })}

      {/* 展开 / 收起 */}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 4, border: 'none', background: 'transparent',
            color: 'var(--color-primary)', fontSize: 12, cursor: 'pointer',
            padding: '4px 0', fontFamily: 'inherit',
          }}
        >
          {showAll ? '收起' : `展开全部 ${stats.length} 项`}
        </button>
      )}
    </div>
  );
}

/** 日视图明细行（长按编辑 / 右侧删除） */
function DayTxRow({ tx, last, onDelete, onEdit }: {
  tx: DayTxList[number]; last: boolean; onDelete?: () => void; onEdit?: () => void;
}) {
  const isExp = tx.type === 'expense';
  const isTransfer = tx.type === 'transfer';
  const color = isTransfer ? 'var(--color-transfer)' : getCategoryColor(tx.categoryName ?? '');
  const IconComp = isTransfer ? ArrowLeftRight : resolveCategoryIcon({ icon: tx.categoryIcon ?? null, name: tx.categoryName ?? '' });
  const name = isTransfer
    ? '转账'
    : tx.categoryName ?? (isExp ? '支出' : '收入');
  const long = useRowLongPress(600);

  return (
    <div
      className="row-press"
      role={onEdit ? 'button' : undefined}
      onTouchStart={onEdit ? long.onStart(onEdit) : undefined}
      onTouchEnd={onEdit ? long.onCancel : undefined}
      onTouchMove={onEdit ? long.onCancel : undefined}
      onMouseDown={onEdit ? long.onStart(onEdit) : undefined}
      onMouseUp={onEdit ? long.onCancel : undefined}
      onMouseLeave={onEdit ? long.onCancel : undefined}
      onContextMenu={onEdit ? (e) => { e.preventDefault(); onEdit(); } : undefined}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0', borderBottom: last ? 'none' : '0.5px solid var(--color-divider)',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: tintColor(color),
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconComp size={15} strokeWidth={1.8} color={color} />
        </div>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.time?.slice(0, 5)}{tx.note ? ` · ${tx.note}` : ''}
            {tx.accountName ? ` · ${tx.accountName}` : ''}
          </div>
        </div>
      </div>
      <span style={{
        fontWeight: 600, fontSize: 14, marginLeft: 10, whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        color: isTransfer ? 'var(--color-text-secondary)' : (isExp ? 'var(--color-expense)' : 'var(--color-income)'),
      }}>
        {isTransfer ? '' : (isExp ? '-' : '+')}¥{(tx.amount / 100).toFixed(2)}
      </span>
      {onDelete && <TxDeleteButton onDelete={onDelete} />}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 8, fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 6px', background: 'var(--color-card)', borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}`, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

/** 通用环比卡片：支出/收入两列涨跌（红增绿减灰平） */
function CompareCard({ title, expenseNow, expensePrev, incomeNow, incomePrev }: {
  title: string;
  expenseNow: number; expensePrev: number;
  incomeNow: number; incomePrev: number;
}) {
  const expenseDiff = expenseNow - expensePrev;
  const incomeDiff = incomeNow - incomePrev;
  const pct = (prev: number, diff: number) => (prev > 0 ? Math.round((Math.abs(diff) / prev) * 100) : 0);
  const diffColor = (v: number) => (v > 0 ? 'var(--color-expense)' : v < 0 ? 'var(--color-income)' : 'var(--color-text-secondary)');

  function renderValue(diff: number, prev: number) {
    if (diff === 0) return '持平';
    const sign = diff > 0 ? '+' : '-';
    return `${sign}${MoneyUtils.format(Math.abs(diff)).replace('¥', '')} (${sign}${pct(prev, diff)}%)`;
  }

  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>支出</div>
          <div style={{ fontSize: 13, marginTop: 2, color: diffColor(expenseDiff), fontWeight: 600 }}>
            {renderValue(expenseDiff, expensePrev)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>收入</div>
          <div style={{ fontSize: 13, marginTop: 2, color: diffColor(incomeDiff), fontWeight: 600 }}>
            {renderValue(incomeDiff, incomePrev)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetCompare({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const remain = budget - spent;
  const color = pct < 80 ? 'var(--color-primary)' : pct <= 100 ? '#FF9F43' : 'var(--color-expense)';
  const overSpent = remain < 0;
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: '12px 14px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>本月预算 vs 实际</span>
        <span style={{ fontSize: 12, color }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-divider)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 300ms ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>支出 <span style={{ color: color, fontWeight: 600 }}>¥{(spent / 100).toFixed(2)}</span> / ¥{(budget / 100).toFixed(2)}</span>
        <span style={{ color: overSpent ? 'var(--color-expense)' : 'var(--color-text-secondary)', fontWeight: overSpent ? 600 : 400 }}>
          {overSpent ? `超支 ¥${(-remain / 100).toFixed(2)}` : `剩余 ¥${(remain / 100).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
      <BarChart3 size={40} strokeWidth={1.2} color="#C7C7CC" />
      <div style={{ marginTop: 8, fontSize: 14 }}>暂无数据</div>
      <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-tertiary)' }}>
        记几笔账，这里就会出现统计图表
      </div>
    </div>
  );
}

/** 加载骨架屏：图表区域的灰色骨架块 + 呼吸动画 */
function StatsSkeleton() {
  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <SkeletonBlock height={40} flex={1} />
        <SkeletonBlock height={40} flex={1} />
      </div>
      <SkeletonBlock height={96} mb={12} />
      <SkeletonBlock height={220} mb={12} />
      <SkeletonBlock height={220} mb={12} />
      <SkeletonBlock height={160} />
    </div>
  );
}

function SkeletonBlock({ height, flex, mb }: { height: number; flex?: number; mb?: number }) {
  return (
    <div style={{
      height,
      flex,
      marginBottom: mb,
      borderRadius: 8,
      background: 'var(--color-divider)',
      animation: 'skeletonBreath 1.4s ease-in-out infinite',
    }} />
  );
}

function getCurrentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** YYYY-MM 位移 delta 个月 */
function shiftYM(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y!, m! - 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 当月天数 */
function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}

/** 把当月实际有记录的日期补成整月 1..N（缺失日期 0 值），X 轴不再断裂 */
function padMonthTrend(trend: DailyTrend[], ym: string): DailyTrend[] {
  const n = daysInMonth(ym);
  const map = new Map(trend.map((d) => [Number(d.date.slice(8)), d]));
  return Array.from({ length: n }, (_, i) => {
    const day = i + 1;
    const hit = map.get(day);
    if (hit) return hit;
    return { date: `${ym}-${String(day).padStart(2, '0')}`, expense: 0, income: 0, count: 0 };
  });
}

/** 把一周范围的实际记录补成完整 7 天（周一..周日） */
function padWeekDays(range: DailyTrend[], monday: Date): DailyTrend[] {
  const map = new Map(range.map((d) => [d.date, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = fmtDate(dt);
    return map.get(key) ?? { date: key, expense: 0, income: 0, count: 0 };
  });
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** echarts axis tooltip：金额以分存储，仅展示层 ÷100 显示为元 */
function axisTooltip() {
  return {
    trigger: 'axis',
    formatter: (params: unknown) => {
      const list = Array.isArray(params) ? params as Array<{ seriesName?: string; color?: string; value?: unknown; name?: string }> : [];
      if (list.length === 0) return '';
      const lines = list.map((p) => {
        const val = typeof p.value === 'number' ? p.value : 0;
        return `<span style="color:${p.color ?? CHART_TEXT}">●</span> ${p.seriesName ?? ''}：¥${(val / 100).toFixed(2)}`;
      }).join('<br/>');
      return `${list[0]!.name ?? ''}<br/>${lines}`;
    },
  };
}

/** 格式化图表 y 轴金额 (单位: 分) */
function formatAxisLabel(v: number): string {
  const yuan = Math.abs(v) / 100;
  if (yuan >= 10000) return `¥${(yuan / 10000).toFixed(1)}万`;
  if (yuan >= 1000) return `¥${(yuan / 1000).toFixed(1)}k`;
  return `¥${yuan.toFixed(0)}`;
}


/** 当月最后一天 YYYY-MM-DD */
function endOfMonth(ym: string): string {
  return `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}`;
}

/** 点击分类构成条目 → 该分类（含二级子分类）在所选时间范围的账单明细 */
function CategoryDrillOverlay({ from, to, cat, onClose }: {
  from: string; to: string; cat: CategoryStat; onClose: () => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const long = useRowLongPress(600);

  useEffect(() => {
    if (categories.length === 0) loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRows() {
    if (categories.length === 0) return;
    const ids = new Set<string>([cat.categoryId]);
    for (const c of categories) if (c.parentId === cat.categoryId) ids.add(c.id);
    const { transactionRepo } = getAppContext();
    try {
      const all = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, dateFrom: from, dateTo: to, limit: 3000 });
      const list = all
        .filter((t) => t.categoryId && ids.has(t.categoryId))
        .sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
      setTxs(list);
    } catch {
      setTxs([]);
    }
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, cat.categoryId, categories.length]);

  async function deleteDrillTx(id: string) {
    try {
      await useTransactionStore.getState().deleteTransaction(id);
      useToast.getState().success('已删除');
      await loadRows();
    } catch {
      useToast.getState().error('删除失败');
    }
  }

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const accent = cat.categoryColor || getCategoryColor(cat.categoryName);
  const IconComp = resolveCategoryIcon({ icon: cat.categoryIcon ?? null, name: cat.categoryName });

  const groups: { date: string; rows: Transaction[] }[] = [];
  for (const tx of txs) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.rows.push(tx);
    else groups.push({ date: tx.date, rows: [tx] });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'var(--color-bg-secondary)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        paddingBottom: 12, paddingLeft: 12, paddingRight: 12,
        background: 'var(--color-bg-secondary)', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 17, background: 'var(--color-card)',
          border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginRight: 4,
        }}>
          <ArrowLeft size={17} color="var(--color-text-primary)" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, background: tintColor(accent),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconComp size={16} strokeWidth={1.8} color={accent} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cat.categoryName}账单
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {from}{from !== to ? ` ~ ${to}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 40px', maxWidth: 500, margin: '0 auto', width: '100%', flex: 1, overflowY: 'auto' }}>
        {/* 汇总 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: tintColor(accent), borderRadius: 12, padding: '12px 14px', margin: '8px 0 12px',
        }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>共 {txs.length} 笔</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
            ¥{(total / 100).toFixed(2)}
          </span>
        </div>

        {txs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
            该时间段内没有「{cat.categoryName}」的账单
          </div>
        )}

        {groups.map((g) => (
          <div key={g.date} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', padding: '4px 2px' }}>
              {g.date}
            </div>
            <div style={{ background: 'var(--color-card)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {g.rows.map((tx, i) => {
                const exp = tx.type === 'expense';
                return (
                  <div
                    key={tx.id}
                    className="row-press"
                    role="button"
                    onTouchStart={long.onStart(() => setEditing(tx))}
                    onTouchEnd={long.onCancel}
                    onTouchMove={long.onCancel}
                    onMouseDown={long.onStart(() => setEditing(tx))}
                    onMouseUp={long.onCancel}
                    onMouseLeave={long.onCancel}
                    onContextMenu={(e) => { e.preventDefault(); setEditing(tx); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: i < g.rows.length - 1 ? '0.5px solid var(--color-divider)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {tx.time?.slice(0, 5)}{tx.note ? ` · ${tx.note}` : ''}
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 600, marginLeft: 10, whiteSpace: 'nowrap',
                      color: exp ? 'var(--color-expense)' : 'var(--color-income)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {exp ? '-' : '+'}¥{(tx.amount / 100).toFixed(2)}
                    </span>
                    <TxDeleteButton onDelete={() => deleteDrillTx(tx.id)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TransactionEditSheet
          tx={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadRows(); }}
        />
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, border: 'none', borderRadius: 15,
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 18,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};
