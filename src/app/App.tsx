import { Component, type ReactNode, useState, useEffect } from 'react';
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
  const [view, setView] = useState<View>({ type: 'tabs', tab: 'home' });
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [budgetInYuan, setBudgetInYuan] = useState<number | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [billsTagFilter, setBillsTagFilter] = useState<string>('');

  useEffect(() => {
    initializeApp().then(() => setReady(true)).catch((e) => setInitError((e as Error).message));
  }, []);

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
    setView({ type: 'tabs', tab: 'bills' });
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
          onOpenRecurring={() => setView({ type: 'recurring' })}
          onBack={() => setView({ type: 'tabs', tab: 'home' })}
        />
      </ErrorBoundary>
    );
  }

  if (view.type === 'recurring') {
    return (
      <ErrorBoundary>
        <RecurringManager onBack={() => setView({ type: 'settings' })} />
      </ErrorBoundary>
    );
  }

  if (view.type === 'account') {
    return (
      <ErrorBoundary>
        <AccountDetailPage accountId={view.accountId} onBack={() => setView({ type: 'tabs', tab: 'home' })} />
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
          <PageHeader title={pageTitles.home} onSettings={() => setView({ type: 'settings' })} />
          <HomePage defAccountId={defaultAccountId} onTagClick={handleTagClick} onAccountClick={(id) => setView({ type: 'account', accountId: id })} />
        </div>
      ),
    },
    {
      key: 'stats', label: '统计', icon: TrendingUp,
      content: (
        <div>
          <PageHeader title={pageTitles.stats} onSettings={() => setView({ type: 'settings' })} />
          <StatsPage />
        </div>
      ),
    },
    {
      key: 'bills', label: '账单', icon: ListFilter,
      content: (
        <div>
          <PageHeader title={pageTitles.bills} onSettings={() => setView({ type: 'settings' })} />
          <BillsPage key={billsTagFilter} initialTag={billsTagFilter || undefined} />
        </div>
      ),
    },
    {
      key: 'mine', label: '我的', icon: User,
      content: (
        <div>
          <PageHeader title={pageTitles.mine} onSettings={() => setView({ type: 'settings' })} />
          <SettingsPage />
        </div>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <ToastContainer />
      <TabBar tabs={tabs} activeTab={tab} onTabChange={(k) => setView({ type: 'tabs', tab: k })} />
    </ErrorBoundary>
  );
}
