/**
 * 统计分析页面
 *
 * 视图: 日 / 周 / 月 / 年 / 自定义
 * - 月视图: 预算 vs 实际 + 收支总览 + 分类构成(CategoryBars) + 每日趋势(点柱切日视图)
 * - 日视图: 日期导航 + 收支总览 + 当天分类构成 + 当天明细
 * - 年视图: 年度总览 + 月度柱状图 + 年度支出排行
 */
import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { Zap, PieChart, ArrowLeftRight, Calendar } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { getCategoryIcon, getCategoryColor, tintColor } from '@/shared/components/CategoryIcons';
import type { StatsRepository, MonthlySummary, CategoryStat, DailyTrend } from '@/data/repositories/StatsRepository';
import { MoneyUtils } from '@/core/types';
import { todayLocal } from '@/core/datetime';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'custom';

/** getDailyTransactions 返回的完整行数组 */
type DayTxList = Awaited<ReturnType<StatsRepository['getDailyTransactions']>>;

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

  // 日数据
  const [daySummary, setDaySummary] = useState<{ expense: number; income: number; count: number } | null>(null);
  const [dayExpenseStats, setDayExpenseStats] = useState<CategoryStat[]>([]);
  const [dayIncomeStats, setDayIncomeStats] = useState<CategoryStat[]>([]);
  const [dayTxs, setDayTxs] = useState<DayTxList>([]);

  const [loading, setLoading] = useState(true);

  const lineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

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
    const { statsRepo } = getAppContext();
    const today = new Date();
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
    const lastSunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);

    const [thisWeek, lastWeek] = await Promise.all([
      statsRepo.getWeekSummary(fmtDate(monday), fmtDate(today)),
      statsRepo.getWeekSummary(fmtDate(lastMonday), fmtDate(lastSunday)),
    ]);

    const thisWeekExpense = thisWeek.expense;
    const thisWeekIncome = thisWeek.income;
    const lastWeekExpense = lastWeek.expense;
    const lastWeekIncome = lastWeek.income;
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
        { name: '支出', type: 'bar', data: dailyTrend.map((d) => d.expense), itemStyle: { color: 'var(--color-expense)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
        { name: '收入', type: 'bar', data: dailyTrend.map((d) => d.income), itemStyle: { color: 'var(--color-income)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
      ],
    });

    // 点柱 → 本页切到「日」视图
    chart.on('click', (params: { name: string }) => {
      const idx = days.indexOf(params.name);
      if (idx >= 0) {
        const target = dailyTrend[idx]!.date;
        setDay(target);
        setView('day');
      }
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
        { name: '支出', type: 'bar', data: yearlyTrend.map((d) => d.totalExpense), itemStyle: { color: 'var(--color-expense)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
        { name: '收入', type: 'bar', data: yearlyTrend.map((d) => d.totalIncome), itemStyle: { color: 'var(--color-income)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
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
      {/* 视图切换 + 时间选择 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 3, flexShrink: 0 }}>
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

        {/* 右侧：日 专属日期导航 / 月、年 ‹ › / 周、自定义 占位 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {view === 'day' && (
            <>
              <button onClick={() => shiftDay(-1)} style={navBtn}>{'‹'}</button>
              <span style={{
                fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)',
                minWidth: 92, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {dayLabel}
              </span>
              <button onClick={() => shiftDay(1)} disabled={isToday} style={{ ...navBtn, opacity: isToday ? 0.3 : 1 }}>{'›'}</button>
              {/* 选日期胶囊 */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '6px 8px', borderRadius: 14,
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  fontSize: 11, fontWeight: 500,
                }}>
                  <Calendar size={12} />
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
            </>
          )}
          {(view === 'month' || view === 'year') && (
            <>
              <button onClick={() => changePeriod(-1)} style={navBtn}>{'‹'}</button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', minWidth: 80, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view === 'month' ? yearMonth.replace('-', '年') + '月' : year + '年'}
              </span>
              <button onClick={() => changePeriod(1)} style={navBtn}>{'›'}</button>
            </>
          )}
          {view === 'week' && <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>本周</span>}
        </div>
      </div>

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
              <CategoryBars title="支出构成" stats={dayExpenseStats} accent="expense" />
            )}
            {dayIncomeStats.length > 0 && (
              <CategoryBars title="收入构成" stats={dayIncomeStats} accent="income" />
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
              <DayTxRow key={tx.id} tx={tx} last={i === dayTxs.length - 1} />
            ))}
          </div>
        </>
      )}
      {view === 'day' && !daySummary && !loading && <EmptyHint />}

      {/* 周视图 */}
      {view === 'week' && weekData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Card label="本周支出" value={MoneyUtils.format(weekData.thisWeekExpense)} color="var(--color-expense)" />
            <Card label="本周收入" value={MoneyUtils.format(weekData.thisWeekIncome)} color="var(--color-income)" />
            <Card label="日均支出" value={MoneyUtils.format(Math.round(weekData.avgDaily))} color="var(--color-primary)" />
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
              <CategoryBars title="支出构成" stats={expenseStats} accent="expense" />
            )}
            {incomeStats.length > 0 && (
              <CategoryBars title="收入构成" stats={incomeStats} accent="income" />
            )}
          </div>
          {expenseStats.length === 0 && incomeStats.length === 0 && <EmptyHint />}

          {dailyTrend.length > 0 && (
            <ChartCard title="每日趋势 (点柱查看当天统计)">
              <div ref={lineRef} style={{ height: 180 }} />
            </ChartCard>
          )}
        </>
      )}

      {/* 年视图 */}
      {view === 'year' && yearSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Card label="年支出" value={MoneyUtils.format(yearSummary.totalExpense)} color="var(--color-expense)" />
          <Card label="年收入" value={MoneyUtils.format(yearSummary.totalIncome)} color="var(--color-income)" />
          <Card label="年结余" value={MoneyUtils.format(yearSummary.totalIncome - yearSummary.totalExpense)} color={yearSummary.totalIncome >= yearSummary.totalExpense ? 'var(--color-primary)' : 'var(--color-expense)'} />
        </div>
      )}

      {view === 'year' && (
        <>
          {yearlyTrend.length > 0 && (
            <ChartCard title="月度收支 (点击月份查看详情)">
              <div ref={barRef} style={{ height: 220 }} />
            </ChartCard>
          )}
          {yearlyExpense.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <RankList title="年度支出排行" stats={yearlyExpense} full />
            </div>
          )}
          {yearlyTrend.length === 0 && yearlyExpense.length === 0 && <EmptyHint />}
        </>
      )}
    </div>
  );
}

// --- 子组件 ---

/** 分类构成卡片：份额堆叠条 + 排行（前 5 + 展开） */
function CategoryBars({ title, stats, accent }: {
  title: string; stats: CategoryStat[]; accent: 'expense' | 'income';
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
        const IconComp = getCategoryIcon(c.categoryName) ?? Zap;
        const pct = Math.round((c.amount / total) * 100);
        return (
          <div key={c.categoryId} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0', borderBottom: i < list.length - 1 ? '0.5px solid var(--color-divider)' : 'none',
          }}>
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

/** 日视图明细行 */
function DayTxRow({ tx, last }: { tx: DayTxList[number]; last: boolean }) {
  const isExp = tx.type === 'expense';
  const isTransfer = tx.type === 'transfer';
  const color = isTransfer ? 'var(--color-transfer)' : getCategoryColor(tx.categoryName ?? '');
  const IconComp = isTransfer ? ArrowLeftRight : (getCategoryIcon(tx.categoryName ?? '') ?? Zap);
  const name = isTransfer
    ? '转账'
    : tx.categoryName ?? (isExp ? '支出' : '收入');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: last ? 'none' : '0.5px solid var(--color-divider)',
    }}>
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

function WeekCompare({ thisWeekExpense, lastWeekExpense, thisWeekIncome, lastWeekIncome }: {
  thisWeekExpense: number; lastWeekExpense: number;
  thisWeekIncome: number; lastWeekIncome: number;
}) {
  const expenseDiff = thisWeekExpense - lastWeekExpense;
  const expensePct = lastWeekExpense > 0 ? Math.round((expenseDiff / lastWeekExpense) * 100) : 0;
  const incomeDiff = thisWeekIncome - lastWeekIncome;
  const incomePct = lastWeekIncome > 0 ? Math.round((incomeDiff / lastWeekIncome) * 100) : 0;
  const diffColor = (v: number) => (v > 0 ? 'var(--color-expense)' : v < 0 ? 'var(--color-income)' : 'var(--color-text-secondary)');

  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 10 }}>环比上周</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>支出</div>
          <div style={{ fontSize: 13, marginTop: 2, color: diffColor(expenseDiff), fontWeight: 600 }}>
            {expenseDiff > 0 ? '+' : ''}{expenseDiff === 0 ? '持平' : `${MoneyUtils.format(expenseDiff).replace('¥', '')} (${expenseDiff > 0 ? '+' : ''}${expensePct}%)`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>收入</div>
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

/** 排行列表（年视图使用） */
function RankList({ title, stats, full }: { title: string; stats: CategoryStat[]; full?: boolean }) {
  const list = full ? stats : stats.slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 8, fontWeight: 600 }}>{title}</h3>
      {list.map((c, i) => {
        const IconComp = getCategoryIcon(c.categoryName) ?? Zap;
        const color = c.categoryColor || getCategoryColor(c.categoryName);
        return (
          <div key={c.categoryId} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: i < list.length - 1 ? '1px solid var(--color-bg-secondary)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ color: '#B0B0B0', width: 14, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: tintColor(color),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IconComp size={14} strokeWidth={1.8} color={color} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.categoryName}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              ¥{(c.amount / 100).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyHint() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
      <PieChart size={40} strokeWidth={1.2} color="#C7C7CC" />
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

/** 格式化图表 y 轴金额 (单位: 分) */
function formatAxisLabel(v: number): string {
  const yuan = Math.abs(v) / 100;
  if (yuan >= 10000) return `¥${(yuan / 10000).toFixed(1)}万`;
  if (yuan >= 1000) return `¥${(yuan / 1000).toFixed(1)}k`;
  return `¥${yuan.toFixed(0)}`;
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, border: 'none', borderRadius: 15,
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 18,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};
