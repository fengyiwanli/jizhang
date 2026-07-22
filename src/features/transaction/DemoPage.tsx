/**
 * MVP Phase 1 验证 Demo
 * 完整链路: 数据库初始化 → 种子数据 → TransactionRepository CRUD → Zustand 状态管理
 */
import { useEffect, useState } from 'react';
import { initializeApp } from '@/data/init';
import { useTransactionStore } from '@/features/transaction/store';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { MoneyUtils } from '@/core/types';
import type { Account } from '@/domain/entities/Account';
import type { Category } from '@/domain/entities/Category';

type AppStatus = 'loading' | 'ready' | 'error';

export default function DemoPage() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const {
    transactions,
    loading: txLoading,
    error: txError,
    loadTransactions,
    createTransaction,
    deleteTransaction,
  } = useTransactionStore();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const ctx = await initializeApp();

      // 查询种子数据验证
      const accs = await ctx.db.query<Account>(
        'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY sort_order',
      );
      const cats = await ctx.db.query<Category>(
        'SELECT * FROM categories WHERE deleted_at IS NULL AND parent_id IS NULL ORDER BY type, sort_order',
      );
      setAccounts(accs);
      setCategories(cats);

      // 加载交易列表
      await loadTransactions(20);
      setStatus('ready');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }

  async function handleCreate() {
    try {
      const amount = Math.floor(Math.random() * 20000) / 100 + 1;
      const types = ['expense', 'income'] as const;
      const type = types[Math.floor(Math.random() * 2)];

      const accountId = accounts[0]?.id ?? '';
      const catList = categories.filter((c) => c.type === type);
      const catId = catList[Math.floor(Math.random() * catList.length)]?.id ?? null;

      const tx = await createTransaction({
        type,
        amountInYuan: amount,
        accountId,
        categoryId: catId,
        note: `测试${type === 'income' ? '收入' : '支出'} - ${new Date().toLocaleTimeString()}`,
        tags: type === 'expense' ? ['测试', 'MVP'] : ['测试'],
      });

      setCreateResult(`✅ 创建成功: ${formatTransaction(tx).typeLabel} ${MoneyUtils.format(tx.amount)}`);
    } catch (e) {
      setCreateResult(`❌ 创建失败: ${(e as Error).message}`);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
    } catch (e) {
      alert(`删除失败: ${(e as Error).message}`);
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ color: '#2C3E50' }}>
          <span style={{ color: '#4ECDC4' }}>记一笔</span> — MVP Phase 1
        </h1>
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#95A5A6' }}>
          ⏳ 正在初始化数据库...
          <br />
          <span style={{ fontSize: 12 }}>sql.js WASM + 建表 + 种子数据</span>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ color: '#FF6B6B' }}>❌ 初始化失败</h1>
        <pre style={{
          background: '#FFF3F3', padding: 16, borderRadius: 8,
          overflow: 'auto', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {error}
        </pre>
      </div>
    );
  }

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ color: '#2C3E50' }}>
        <span style={{ color: '#4ECDC4' }}>记一笔</span> — MVP Phase 1 验证
      </h1>

      {/* 状态卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        margin: '20px 0',
      }}>
        <StatusCard label="数据库" value="✅ SQLite" color="#4ECDC4" />
        <StatusCard label="种子数据" value={`${accounts.length}账户 ${categories.length}分类`} color="#96CEB4" />
        <StatusCard label="交易数" value={`${transactions.length} 条`} color="#45B7D1" />
        <StatusCard label="支出合计" value={MoneyUtils.format(totalExpense)} color="#FF6B6B" />
        <StatusCard label="收入合计" value={MoneyUtils.format(totalIncome)} color="#2ECC71" />
      </div>

      {/* 操作区 */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={handleCreate} style={btnStyle}>
          + 随机创建一笔交易
        </button>
        <button onClick={() => loadTransactions(20)} style={{ ...btnStyle, marginLeft: 8, background: '#95A5A6' }}>
          🔄 刷新
        </button>
        {createResult && (
          <p style={{
            marginTop: 8, fontSize: 13,
            color: createResult.startsWith('✅') ? '#2ECC71' : '#FF6B6B',
          }}>
            {createResult}
          </p>
        )}
      </div>

      {/* 错误提示 */}
      {txError && (
        <div style={{ padding: 12, background: '#FFF3F3', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ⚠️ {txError}
        </div>
      )}

      {/* 交易列表 */}
      <div>
        <h3 style={{ color: '#2C3E50', marginBottom: 12 }}>
          📋 交易列表
          {txLoading && <span style={{ color: '#95A5A6', fontSize: 14 }}> 加载中...</span>}
        </h3>
        {transactions.length === 0 && !txLoading && (
          <div style={{
            padding: 40, textAlign: 'center', color: '#95A5A6',
            background: '#FFF', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            📭 暂无交易记录
            <br />
            <span style={{ fontSize: 12 }}>点击上方按钮创建一笔</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transactions.map((tx) => {
            const fmt = formatTransaction(tx);
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const cat = categories.find((c) => c.id === tx.categoryId);

            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{cat?.icon ?? '📦'}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#2C3E50' }}>
                      {cat?.name ?? fmt.typeLabel}
                    </div>
                    <div style={{ fontSize: 12, color: '#95A5A6', marginTop: 2 }}>
                      {tx.date} {tx.time?.substring(0, 5)}
                      {tx.note && ` · ${tx.note}`}
                      {fmt.tagsList.length > 0 && ` · ${fmt.tagsList.join(', ')}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontWeight: 600, fontSize: 16,
                    color: isExpense ? '#FF6B6B' : isIncome ? '#2ECC71' : '#3498DB',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {isExpense ? '-' : isIncome ? '+' : '↔'} {fmt.amountDisplay}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 14, padding: '4px 8px', borderRadius: 6, color: '#E74C3C',
                    }}
                    title="删除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: 16, background: '#FFFFFF', borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: '#95A5A6' }}>{label}</div>
      <div style={{ fontSize: 14, color: '#2C3E50', marginTop: 4, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', border: 'none', borderRadius: 10,
  background: '#4ECDC4', color: '#FFFFFF',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
