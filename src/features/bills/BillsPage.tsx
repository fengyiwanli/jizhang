/**
 * 账单页面 — 搜索 + 多维筛选 + 按日期分组列表
 */
import { useEffect, useState, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { getAppContext } from '@/data/init';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { getCategoryIcon, getCategoryColor } from '@/shared/components/CategoryIcons';
import { MoneyUtils } from '@/core/types';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import type { Transaction } from '@/domain/entities/Transaction';
import type { TransactionType } from '@/core/types';
import type { UUID } from '@/core/types';
import type { Category } from '@/domain/entities/Category';
import type { Account } from '@/domain/entities/Account';

const PAGE_SIZE = 30;

export default function BillsPage() {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [catFilter, setCatFilter] = useState<UUID | 'all'>('all');
  const [accFilter, setAccFilter] = useState<UUID | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({
      ledgerId: DEFAULT_LEDGER_ID,
      type: typeFilter === 'all' ? undefined : typeFilter,
      categoryId: catFilter === 'all' ? undefined : catFilter,
      accountId: accFilter === 'all' ? undefined : accFilter,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: PAGE_SIZE,
    });
    setTransactions(txs);
    setLoading(false);
  }, [keyword, typeFilter, catFilter, accFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // 按日期分组
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: '12px 16px 80px', maxWidth: 500, margin: '0 auto' }}>
      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索备注、分类..."
          style={searchInputStyle}
        />
        <button onClick={() => setShowFilters(!showFilters)} style={filterBtnStyle(showFilters)}>
          筛选 {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <SelectBtn
            options={[
              { value: 'all', label: '全部' },
              { value: 'expense', label: '支出' },
              { value: 'income', label: '收入' },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TransactionType | 'all')}
          />
          <SelectBtn
            options={[
              { value: 'all', label: '全部分类' },
              ...categories.filter((c) => !c.parentId).map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
            ]}
            value={catFilter}
            onChange={(v) => setCatFilter(v as UUID | 'all')}
          />
          <SelectBtn
            options={[
              { value: 'all', label: '全部账户' },
              ...accounts.map((a) => ({ value: a.id, label: `${a.icon ?? ''} ${a.name}` })),
            ]}
            value={accFilter}
            onChange={(v) => setAccFilter(v as UUID | 'all')}
          />
          <input
            type="date"
            value={dateFrom}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateFrom(e.target.value)}
            style={dateInputStyle}
            placeholder="开始日期"
          />
          <span style={{ fontSize: 12, color: '#8E8E93', alignSelf: 'center' }}>至</span>
          <input
            type="date"
            value={dateTo}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateTo(e.target.value)}
            style={dateInputStyle}
            placeholder="结束日期"
          />
        </div>
      )}

      {/* 列表 */}
      {loading && <p style={{ textAlign: 'center', color: '#8E8E93', padding: 20 }}>加载中...</p>}

      {!loading && transactions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>
          <div style={{ fontSize: 36 }}>📭</div>
          <div style={{ marginTop: 8 }}>没有找到交易</div>
        </div>
      )}

      {dates.map((date) => {
        const dayTotal = grouped[date]!.reduce(
          (s, t) => s + (t.type === 'expense' ? -t.amount : t.type === 'income' ? t.amount : 0),
          0,
        );

        return (
          <div key={date} style={{ marginBottom: 16 }}>
            {/* 日期头 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 4px', borderBottom: '1px solid #F0F0F0', marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
                {formatDate(date)}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: dayTotal > 0 ? '#5FBB97' : dayTotal < 0 ? '#E07B6C' : '#8E8E93',
              }}>
                {dayTotal >= 0 ? '+' : ''}¥{(Math.abs(dayTotal) / 100).toFixed(2)}
              </span>
            </div>

            {/* 交易项 */}
            {grouped[date]!.map((tx) => {
              const fmt = formatTransaction(tx);
              const cat = getCat(categories, tx.categoryId);
              const acc = getAcc(accounts, tx.accountId);

              return (
                <TxItem
                  key={tx.id}
                  categoryName={cat?.name ?? null}
                  name={cat?.name ?? (tx.type === 'expense' ? '支出' : tx.type === 'income' ? '收入' : '转账')}
                  note={tx.note}
                  time={tx.time?.slice(0, 5)}
                  account={acc ? `${acc.icon ?? ''} ${acc.name}` : ''}
                  amount={tx.amount}
                  type={tx.type}
                  tags={fmt.tagsList}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// --- 子组件 ---

function TxItem({ categoryName, name, note, time, account, amount, type, tags }: {
  categoryName: string | null; name: string; note: string; time: string;
  account: string; amount: number; type: string; tags: string[];
}) {
  const isExpense = type === 'expense';
  const isIncome = type === 'income';
  const IconComp = getCategoryIcon(categoryName ?? '') ?? Zap;
  const color = getCategoryColor(categoryName ?? '');

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 8px', borderBottom: '1px solid #F5F5F7',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#F5F5F7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={16} strokeWidth={1.8} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 1 }}>
            {time}
            {note && ` · ${note}`}
            {account && ` · ${account}`}
            {tags.length > 0 && ` · ${tags.join(' ')}`}
          </div>
        </div>
      </div>
      <span style={{
        fontWeight: 600, fontSize: 14, marginLeft: 12, whiteSpace: 'nowrap',
        color: isExpense ? '#E07B6C' : isIncome ? '#5FBB97' : '#3498DB',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isExpense ? '-' : isIncome ? '+' : ''}{MoneyUtils.format(amount).replace('¥', '')}
      </span>
    </div>
  );
}

function SelectBtn({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      padding: '8px 10px', border: 'none', borderRadius: 10,
      fontSize: 12, color: '#1A1A2E', background: '#F5F5F7', fontFamily: 'inherit',
    }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function getCat(categories: Category[], id: UUID | null): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}

function getAcc(accounts: Account[], id: UUID): Account | undefined {
  return accounts.find((a) => a.id === id);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let label = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (dateStr === today) label = '今天';
  else if (dateStr === yesterday) label = '昨天';

  return `${label} 周${weekdays[d.getDay()]}`;
}

const dateInputStyle: React.CSSProperties = {
  padding: '8px 10px', border: 'none', borderRadius: 10,
  fontSize: 11, color: '#1A1A2E', outline: 'none', fontFamily: 'inherit',
  background: '#F5F5F7',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1, padding: '10px 14px', border: '1px solid #E8E8ED', borderRadius: 12,
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
  background: '#FFF',
};

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 14px', border: 'none',
    borderRadius: 12, background: active ? '#E8FAF8' : '#F5F5F7',
    color: active ? '#4ECDC4' : '#8E8E93', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
}
