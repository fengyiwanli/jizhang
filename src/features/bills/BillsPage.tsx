/**
 * 账单页面 — 搜索 + 多维筛选 + 按日期分组列表
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Zap, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { BottomSheet, SheetOption } from '@/shared/components/BottomSheet';
import TransactionEditSheet from '@/shared/components/TransactionEditSheet';
import TxDeleteButton from '@/shared/components/TxDeleteButton';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import { getAppContext } from '@/data/init';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { formatTransaction } from '@/data/repositories/TransactionRepository';
import { getCategoryColor, tintColor, resolveCategoryIcon } from '@/shared/components/CategoryIcons';
import { MoneyUtils } from '@/core/types';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import { todayLocal } from '@/core/datetime';
import type { Transaction } from '@/domain/entities/Transaction';
import type { TransactionType } from '@/core/types';
import type { UUID } from '@/core/types';
import type { Category } from '@/domain/entities/Category';
import type { Account } from '@/domain/entities/Account';

const PAGE_SIZE = 30;

/** 筛选面板状态（面板内 5 个维度） */
interface FilterState {
  type: TransactionType | 'all';
  cat: UUID | 'all';
  acc: UUID | 'all';
  tags: string[];
  from: string;
  to: string;
}

const EMPTY_FILTER: FilterState = { type: 'all', cat: 'all', acc: 'all', tags: [], from: '', to: '' };

function isFilterEmpty(f: FilterState): boolean {
  return f.type === 'all' && f.cat === 'all' && f.acc === 'all'
    && f.tags.length === 0 && !f.from && !f.to;
}

export default function BillsPage({ initialTag }: { initialTag?: string }) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  // 关键字：实时筛选
  const [keyword, setKeyword] = useState('');

  // 筛选面板：draft = 面板内编辑中；applied = 真正驱动查询
  const [applied, setApplied] = useState<FilterState>(() => ({
    ...EMPTY_FILTER,
    tags: initialTag ? [initialTag] : [],
  }));
  const [draft, setDraft] = useState<FilterState>(applied);
  const [showFilters, setShowFilters] = useState(false);
  const [sheet, setSheet] = useState<'category' | 'account' | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('bk_search_history') || '[]'); }
    catch { return []; }
  });

  // 标签候选：来自全部交易中已使用过的标签
  useEffect(() => {
    const { transactionRepo } = getAppContext();
    transactionRepo.getAllTags(DEFAULT_LEDGER_ID).then(setAllTags).catch(() => setAllTags([]));
  }, [transactions]);

  // 展开面板时，把已应用的筛选同步进草稿
  function toggleFilters() {
    if (!showFilters) setDraft(applied);
    setShowFilters(!showFilters);
  }

  function saveSearchHistory(kw: string) {
    const t = kw.trim();
    if (!t) return;
    const next = [t, ...searchHistory.filter((x) => x !== t)].slice(0, 10);
    setSearchHistory(next);
    localStorage.setItem('bk_search_history', JSON.stringify(next));
  }

  const buildFilter = useCallback(() => ({
    ledgerId: DEFAULT_LEDGER_ID,
    type: applied.type === 'all' ? undefined : applied.type,
    categoryId: applied.cat === 'all' ? undefined : applied.cat,
    accountId: applied.acc === 'all' ? undefined : applied.acc,
    keyword: keyword || undefined,
    tags: applied.tags.length > 0 ? applied.tags : undefined,
    dateFrom: applied.from || undefined,
    dateTo: applied.to || undefined,
  }), [applied, keyword]);

  const reload = useCallback(async () => {
    setLoading(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({ ...buildFilter(), limit: PAGE_SIZE, offset: 0 });
    setTransactions(txs);
    setHasMore(txs.length === PAGE_SIZE);
    offsetRef.current = txs.length;
    setLoading(false);
  }, [buildFilter]);

  const loadMore = useCallback(async () => {
    setLoading(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({ ...buildFilter(), limit: PAGE_SIZE, offset: offsetRef.current });
    setTransactions((prev) => [...prev, ...txs]);
    setHasMore(txs.length === PAGE_SIZE);
    offsetRef.current += txs.length;
    setLoading(false);
  }, [buildFilter]);

  useEffect(() => { reload(); }, [reload]);

  /** 行删除：确认后走 store 软删，刷新列表 */
  async function handleDeleteTx(id: string) {
    try {
      await useTransactionStore.getState().deleteTransaction(id);
      useToast.getState().success('已删除');
      reload();
    } catch {
      useToast.getState().error('删除失败');
    }
  }

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
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={15}
            color="var(--color-text-tertiary)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveSearchHistory(keyword); }}
            onBlur={() => saveSearchHistory(keyword)}
            placeholder="搜索备注、分类..."
            style={searchInputStyle}
          />
        </div>
        <button onClick={toggleFilters} style={filterBtnStyle(showFilters, !isFilterEmpty(applied))}>
          <SlidersHorizontal size={14} />
          筛选
          <ChevronDown
            size={14}
            style={{
              transition: 'transform 200ms ease',
              transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>

      {/* 搜索历史 */}
      {searchHistory.length > 0 && !keyword && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {searchHistory.map((h) => (
            <span
              key={h}
              onClick={() => setKeyword(h)}
              style={{
                fontSize: 12, color: 'var(--color-text-tertiary)', background: 'var(--color-bg-secondary)',
                padding: '4px 10px', borderRadius: 12, cursor: 'pointer',
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {/* 筛选器 — 卡片容器 + 分组 + chips + 自定义触发器 */}
      {showFilters && (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 14,
          padding: 16,
          border: '0.5px solid var(--color-border)',
          marginBottom: 12,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* 类型 — chips 单选 */}
          <FilterGroup title="类型">
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { v: 'all', label: '全部' },
                { v: 'expense', label: '支出' },
                { v: 'income', label: '收入' },
                { v: 'transfer', label: '转账' },
              ] as const).map(({ v, label }) => (
                <Chip
                  key={v}
                  label={label}
                  selected={draft.type === v}
                  onClick={() => setDraft({ ...draft, type: v })}
                />
              ))}
            </div>
          </FilterGroup>

          {/* 分类 / 账户 — 两列并排，自定义触发器 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FilterGroup title="分类">
              <Trigger
                text={draft.cat === 'all'
                  ? '全部分类'
                  : (() => { const c = getCat(categories, draft.cat); return c ? c.name : '全部分类'; })()}
                placeholder={draft.cat === 'all'}
                onClick={() => setSheet('category')}
              />
            </FilterGroup>
            <FilterGroup title="账户">
              <Trigger
                text={draft.acc === 'all'
                  ? '全部账户'
                  : (() => { const a = accounts.find((x) => x.id === draft.acc); return a ? `${a.icon ?? ''} ${a.name}`.trim() : '全部账户'; })()}
                placeholder={draft.acc === 'all'}
                onClick={() => setSheet('account')}
              />
            </FilterGroup>
          </div>

          {/* 日期区间 — 两个等宽触发器 + 短横线 */}
          <FilterGroup title="日期区间">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DateTrigger
                value={draft.from}
                placeholder="开始日期"
                max={todayLocal()}
                onChange={(v) => setDraft({ ...draft, from: v })}
              />
              <span style={{ flexShrink: 0, width: 10, height: 1, background: 'var(--color-text-disabled)' }} />
              <DateTrigger
                value={draft.to}
                placeholder="结束日期"
                max={todayLocal()}
                onChange={(v) => setDraft({ ...draft, to: v })}
              />
            </div>
          </FilterGroup>

          {/* 标签 — chips 多选 */}
          <FilterGroup title="标签">
            {allTags.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
                暂无标签，记账时可添加
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allTags.map((t) => {
                  const selected = draft.tags.includes(t);
                  return (
                    <Chip
                      key={t}
                      label={`#${t}`}
                      selected={selected}
                      variant="tag"
                      onClick={() => setDraft({
                        ...draft,
                        tags: selected ? draft.tags.filter((x) => x !== t) : [...draft.tags, t],
                      })}
                    />
                  );
                })}
              </div>
            )}
          </FilterGroup>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setDraft(EMPTY_FILTER);
                setApplied(EMPTY_FILTER);
              }}
            >
              重置
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2 }}
              onClick={() => setApplied(draft)}
            >
              查看结果
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {loading && transactions.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 20 }}>加载中...</p>}

      {!loading && transactions.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', padding: '2px 4px 8px' }}>
          长按记录可编辑或删除
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          <Search size={40} strokeWidth={1.2} color="#C7C7CC" />
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {keyword || !isFilterEmpty(applied) ? '没有找到匹配的交易' : '还没有任何交易'}
          </div>
          {(keyword || !isFilterEmpty(applied)) && (
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-tertiary)' }}>
              试试更换关键字或清除筛选条件
            </div>
          )}
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
              padding: '6px 4px', borderBottom: '1px solid var(--color-divider)', marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatDate(date)}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: dayTotal > 0 ? 'var(--color-income)' : dayTotal < 0 ? 'var(--color-expense)' : 'var(--color-text-tertiary)',
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
                  cat={cat ?? null}
                  fallbackName={tx.type === 'expense' ? '支出' : tx.type === 'income' ? '收入' : '转账'}
                  note={tx.note}
                  time={tx.time?.slice(0, 5)}
                  account={acc ? `${acc.icon ?? ''} ${acc.name}` : ''}
                  amount={tx.amount}
                  type={tx.type}
                  tags={fmt.tagsList}
                  keyword={keyword}
                  onLongPress={() => setEditingTx(tx)}
                  onDelete={() => handleDeleteTx(tx.id)}
                />
              );
            })}
          </div>
        );
      })}

      {/* 加载更多 */}
      {hasMore && (
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <button className="btn-secondary" onClick={loadMore} disabled={loading}>
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 底部弹层：分类 / 账户 */}
      {sheet === 'category' && (
        <BottomSheet title="选择分类" onClose={() => setSheet(null)}>
          <SheetOption
            label="全部分类"
            selected={draft.cat === 'all'}
            onSelect={() => { setDraft({ ...draft, cat: 'all' }); setSheet(null); }}
          />
          {categories.filter((c) => !c.parentId).map((c) => (
            <SheetOption
              key={c.id}
              icon={catIconEl(c)}
              label={c.name}
              selected={draft.cat === c.id}
              onSelect={() => { setDraft({ ...draft, cat: c.id }); setSheet(null); }}
            />
          ))}
        </BottomSheet>
      )}

      {sheet === 'account' && (
        <BottomSheet title="选择账户" onClose={() => setSheet(null)}>
          <SheetOption
            label="全部账户"
            selected={draft.acc === 'all'}
            onSelect={() => { setDraft({ ...draft, acc: 'all' }); setSheet(null); }}
          />
          {accounts.map((a) => (
            <SheetOption
              key={a.id}
              label={`${a.icon ?? ''} ${a.name}`.trim()}
              selected={draft.acc === a.id}
              onSelect={() => { setDraft({ ...draft, acc: a.id }); setSheet(null); }}
            />
          ))}
        </BottomSheet>
      )}

      {/* 编辑账单弹层 */}
      {editingTx && (
        <TransactionEditSheet
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); reload(); }}
        />
      )}
    </div>
  );
}

// --- 子组件 ---

/** 分类名左侧小图标（Lucide key / emoji 名字映射统一） */
function catIconEl(cat: Category, size = 16) {
  const I = resolveCategoryIcon(cat);
  return <I size={size} strokeWidth={1.8} color={cat.color || getCategoryColor(cat.name)} />;
}

function highlight(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FFF3B0', color: 'inherit', padding: '0 1px', borderRadius: 2 }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

function TxItem({ cat, fallbackName, note, time, account, amount, type, tags, keyword, onLongPress, onDelete }: {
  cat: Category | null; fallbackName: string; note: string; time: string;
  account: string; amount: number; type: string; tags: string[]; keyword?: string;
  onLongPress: () => void; onDelete?: () => void;
}) {
  const isExpense = type === 'expense';
  const isIncome = type === 'income';
  const name = cat?.name ?? fallbackName;
  const IconComp = cat ? resolveCategoryIcon(cat) : Zap;
  const color = cat ? (cat.color || getCategoryColor(cat.name)) : getCategoryColor(name);
  const lpRef = useRef<number | null>(null);
  const startPress = () => { lpRef.current = window.setTimeout(onLongPress, 600); };
  const cancelPress = () => { if (lpRef.current !== null) { clearTimeout(lpRef.current); lpRef.current = null; } };

  return (
    <div
      className="row-press"
      role="button"
      aria-label="长按编辑"
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 8px', borderBottom: '1px solid var(--color-bg-secondary)',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          /* 图标底色跟随分类色，10% 透明度，列表更有层次 */
          background: tintColor(color),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={16} strokeWidth={1.8} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {highlight(name, keyword ?? '')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {time}
            {note && <> · {highlight(note, keyword ?? '')}</>}
            {account && ` · ${account}`}
            {tags.length > 0 && ` · ${tags.join(' ')}`}
          </div>
        </div>
      </div>
      <span style={{
        fontWeight: 600, fontSize: 14, marginLeft: 12, whiteSpace: 'nowrap',
        color: isExpense ? 'var(--color-expense)' : isIncome ? 'var(--color-income)' : 'var(--color-transfer)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {isExpense ? '-' : isIncome ? '+' : ''}{MoneyUtils.format(amount).replace('¥', '')}
      </span>
      {onDelete && <TxDeleteButton onDelete={onDelete} />}
    </div>
  );
}

/** 筛选维度小标题 */
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500,
        marginBottom: 8, letterSpacing: 0.3,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/** 筛选 chip：default = 主色实心选中；tag = 淡色选中 */
function Chip({ label, selected, onClick, variant = 'default' }: {
  label: string; selected: boolean; onClick: () => void; variant?: 'default' | 'tag';
}) {
  const activeStyle = variant === 'tag'
    ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)' }
    : { background: 'var(--color-primary)', color: '#FFF' };

  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 10,
        minHeight: 36,
        border: 'none',
        fontFamily: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        ...(selected ? activeStyle : null),
      }}
    >
      {label}
    </button>
  );
}

/** 自定义触发器：替代原生 <select>，右侧带 chevron */
function Trigger({ text, placeholder, onClick }: {
  text: string; placeholder: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', minHeight: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        padding: '11px 12px',
        border: 'none',
        borderRadius: 10,
        background: 'var(--color-bg-secondary)',
        fontFamily: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
        color: placeholder ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
        {text}
      </span>
      <ChevronDown size={13} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  );
}

/**
 * 日期触发器：外观自定义，内部叠一个 opacity:0 的原生 date input
 * 保留原生日期弹层能力，同时绕开 global.css 的 font-size: 16px !important
 */
function DateTrigger({ value, placeholder, max, onChange }: {
  value: string; placeholder: string; max?: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <Trigger text={value || placeholder} placeholder={!value} onClick={() => { /* 由透明 input 接管点击 */ }} />
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer',
        }}
      />
    </div>
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
  const today = todayLocal();
  const yesterday = (() => {
    const d = new Date(Date.now() - 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  let label = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (dateStr === today) label = '今天';
  else if (dateStr === yesterday) label = '昨天';

  return `${label} 周${weekdays[d.getDay()]}`;
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px 11px 36px',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  background: 'var(--color-card)',
  color: 'var(--color-text-primary)',
};

function filterBtnStyle(active: boolean, hasActive: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '10px 14px',
    border: 'none',
    borderRadius: 12,
    background: active ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
    color: active || hasActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
}
