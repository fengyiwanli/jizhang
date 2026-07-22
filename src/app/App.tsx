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
import DailyDetailPage from '@/features/stats/DailyDetailPage';
import { initializeApp, getAppContext } from '@/data/init';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui' }}>
          <h1 style={{ color: '#E07B6C' }}>渲染错误</h1>
          <pre style={{ background: '#FFF3F3', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const STORAGE_KEY_BUDGET = 'bk_budget';
const STORAGE_KEY_ACCOUNT = 'bk_default_acc';

type View = { type: 'tabs'; tab: string } | { type: 'settings' } | { type: 'daily'; date: string };

export default function App() {
  const [view, setView] = useState<View>({ type: 'tabs', tab: 'home' });
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [budgetInYuan, setBudgetInYuan] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY_BUDGET);
    return v ? parseFloat(v) : null;
  });
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ACCOUNT) || null;
  });

  useEffect(() => {
    initializeApp().then(() => setReady(true)).catch((e) => setInitError((e as Error).message));
  }, []);

  function handleBudgetChange(v: number | null) {
    setBudgetInYuan(v);
    if (v !== null) localStorage.setItem(STORAGE_KEY_BUDGET, String(v));
    else localStorage.removeItem(STORAGE_KEY_BUDGET);
  }

  function handleDefaultAccChange(id: string | null) {
    setDefaultAccountId(id);
    if (id) localStorage.setItem(STORAGE_KEY_ACCOUNT, id);
    else localStorage.removeItem(STORAGE_KEY_ACCOUNT);
  }

  async function handleClearData() {
    try {
      const ctx = getAppContext();
      await ctx.transactionRepo.clearAll();
      await ctx.accountRepo.clearAll();
      await ctx.categoryRepo.clearAll();
      localStorage.clear();
      window.location.reload();
    } catch (e) { console.error('清除失败', e); }
  }

  if (initError) {
    return <div style={{ padding: 24, fontFamily: 'system-ui' }}><h1 style={{ color: '#E07B6C' }}>初始化失败</h1><pre style={{ background: '#FFF3F3', padding: 16, borderRadius: 8, fontSize: 13 }}>{initError}</pre></div>;
  }

  if (!ready) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#8E8E93', flexDirection: 'column', gap: 12 }}><div style={{ fontSize: 32 }}>⏳</div><div>正在初始化...</div></div>;
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
          onBack={() => setView({ type: 'tabs', tab: 'home' })}
        />
      </ErrorBoundary>
    );
  }

  if (view.type === 'daily') {
    return (
      <ErrorBoundary>
        <DailyDetailPage date={view.date} onBack={() => setView({ type: 'tabs', tab: 'stats' })} />
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
          <HomePage defAccountId={defaultAccountId} />
        </div>
      ),
    },
    {
      key: 'stats', label: '统计', icon: TrendingUp,
      content: (
        <div>
          <PageHeader title={pageTitles.stats} onSettings={() => setView({ type: 'settings' })} />
          <StatsPage onDayClick={(date) => setView({ type: 'daily', date })} />
        </div>
      ),
    },
    {
      key: 'bills', label: '账单', icon: ListFilter,
      content: (
        <div>
          <PageHeader title={pageTitles.bills} onSettings={() => setView({ type: 'settings' })} />
          <BillsPage />
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
