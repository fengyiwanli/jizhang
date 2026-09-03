import { Component, type ReactNode, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { BookOpen, TrendingUp, ListFilter, User } from 'lucide-react';
import TabBar from '@/shared/components/TabBar';
import { ToastContainer } from '@/shared/components/Toast';
import PageHeader from '@/shared/components/PageHeader';
import HomePage from '@/features/transaction/HomePage';
import StatsPage from '@/features/stats/StatsPage';
import BillsPage from '@/features/bills/BillsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import SettingsView from '@/features/settings/SettingsView';
import RecurringManager from '@/features/settings/RecurringManager';
import AccountDetailPage from '@/features/account/AccountDetailPage';
import { initializeApp, getAppContext } from '@/data/init';
import { todayLocal } from '@/core/datetime';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui' }}>
          <h1 style={{ color: 'var(--color-expense)' }}>渲染错误</h1>
          <pre style={{ background: '#FFF3F3', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ACCOUNT_SETTING_KEY = 'default_account_id';

type View = { type: 'tabs'; tab: string } | { type: 'settings' } | { type: 'recurring' } | { type: 'account'; accountId: string };

export default function App() {
  // 导航栈：子页面(设置/固定收支/账户)逐层压栈；Android 系统返回手势弹栈回上一页，而不是退出
  const [stack, setStack] = useState<View[]>([{ type: 'tabs', tab: 'home' }]);
  const view = stack[stack.length - 1]!;
  const navigate = (v: View) => setStack((prev) => [...prev, v]);
  const goBack = () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  const switchTab = (tab: string) => {
    setStack((prev) => (prev[prev.length - 1]?.type === 'tabs'
      ? [...prev.slice(0, -1), { type: 'tabs', tab }]
      : [...prev, { type: 'tabs', tab }]));
  };
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const stackRef = useRef(1);
  useEffect(() => { stackRef.current = stack.length; }, [stack]);

  const [budgetInYuan, setBudgetInYuan] = useState<number | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [billsTagFilter, setBillsTagFilter] = useState<string>('');

  useEffect(() => {
    initializeApp().then(() => setReady(true)).catch((e) => setInitError((e as Error).message));
  }, []);

  // 系统返回（手势/按键）：原生 App 用 backButton 事件弹栈；网页端用 history/popstate
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handler = CapApp.addListener('backButton', () => {
        if (stackRef.current > 1) {
          goBack();
        } else {
          // 已在首页：按系统习惯退出
          CapApp.exitApp();
        }
      });
      return () => { handler.then((h) => h.remove()).catch(() => {}); };
    }
    // 非原生（浏览器预览）：维持一个历史项，返回手势走 popstate 弹栈
    window.history.pushState({}, '');
    const onPop = () => {
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      window.history.pushState({}, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goBack]);

  // ready 后从 SQLite 读取当前月预算 + 默认账户
  useEffect(() => {
    if (!ready) return;
    const ctx = getAppContext();
    const ym = todayLocal().slice(0, 7);
    ctx.budgetRepo.getTotalBudget(ym).then((amount) => {
      setBudgetInYuan(amount !== null ? amount / 100 : null);
    });
    ctx.settingsRepo.get(ACCOUNT_SETTING_KEY).then(setDefaultAccountId);
  }, [ready]);

  function handleBudgetChange(v: number | null) {
    setBudgetInYuan(v);
    const { budgetRepo } = getAppContext();
    const ym = todayLocal().slice(0, 7);
    if (v !== null) budgetRepo.setTotalBudget(ym, v);
    else budgetRepo.removeTotalBudget(ym);
  }

  function handleDefaultAccChange(id: string | null) {
    setDefaultAccountId(id);
    const { settingsRepo } = getAppContext();
    if (id) settingsRepo.set(ACCOUNT_SETTING_KEY, id);
    else settingsRepo.remove(ACCOUNT_SETTING_KEY);
  }

  function handleTagClick(tag: string) {
    setBillsTagFilter(tag);
    switchTab('bills');
  }

  async function handleClearData() {
    try {
      const ctx = getAppContext();
      await ctx.transactionRepo.clearAll();
      await ctx.accountRepo.clearAll();
      await ctx.categoryRepo.clearAll();
      await ctx.db.execute('DELETE FROM recurring_rules');
      await ctx.budgetRepo.clearAll();
      await ctx.settingsRepo.clearAll();
      localStorage.clear();
      window.location.reload();
    } catch (e) { console.error('清除失败', e); }
  }

  if (initError) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}><h1 style={{ color: 'var(--color-expense)' }}>初始化失败</h1><pre style={{ background: '#FFF3F3', padding: 16, borderRadius: 8, fontSize: 13 }}>{initError}</pre></div>;
  }

  if (!ready) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: 'var(--color-text-secondary)', flexDirection: 'column', gap: 12 }}><div style={{ fontSize: 32 }}>⏳</div><div>正在初始化...</div></div>;
  }

  // --- 子页面视图 ---
  if (view.type === 'settings') {
    return (
      <ErrorBoundary>
        <SettingsView
          defaultAccountId={defaultAccountId}
          defaultAccOnChange={handleDefaultAccChange}
          budgetInYuan={budgetInYuan}
          budgetOnChange={handleBudgetChange}
          onClearData={handleClearData}
          onOpenRecurring={() => navigate({ type: 'recurring' })}
          onBack={goBack}
        />
      </ErrorBoundary>
    );
  }

  if (view.type === 'recurring') {
    return (
      <ErrorBoundary>
        <RecurringManager onBack={goBack} />
      </ErrorBoundary>
    );
  }

  if (view.type === 'account') {
    return (
      <ErrorBoundary>
        <AccountDetailPage accountId={view.accountId} onBack={goBack} />
      </ErrorBoundary>
    );
  }

  // --- 主 Tab 视图 ---
  const tab = view.type === 'tabs' ? view.tab : 'home';
  const pageTitles: Record<string, string> = { home: '记一笔', stats: '统计', bills: '账单', mine: '我的' };

  const tabs = [
    {
      key: 'home', label: '首页', icon: BookOpen,
      content: (
        <div>
          <PageHeader title={pageTitles.home} onSettings={() => navigate({ type: 'settings' })} />
          <HomePage defAccountId={defaultAccountId} onTagClick={handleTagClick} onAccountClick={(id) => navigate({ type: 'account', accountId: id })} />
        </div>
      ),
    },
    {
      key: 'stats', label: '统计', icon: TrendingUp,
      content: (
        <div>
          <PageHeader title={pageTitles.stats} onSettings={() => navigate({ type: 'settings' })} />
          <StatsPage />
        </div>
      ),
    },
    {
      key: 'bills', label: '账单', icon: ListFilter,
      content: (
        <div>
          <PageHeader title={pageTitles.bills} onSettings={() => navigate({ type: 'settings' })} />
          <BillsPage key={billsTagFilter} initialTag={billsTagFilter || undefined} />
        </div>
      ),
    },
    {
      key: 'mine', label: '我的', icon: User,
      content: (
        <div>
          <PageHeader title={pageTitles.mine} onSettings={() => navigate({ type: 'settings' })} />
          <SettingsPage />
        </div>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <ToastContainer />
      <TabBar tabs={tabs} activeTab={tab} onTabChange={switchTab} />
    </ErrorBoundary>
  );
}
