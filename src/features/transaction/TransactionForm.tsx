/**
 * 记账表单 — 现代极简风格
 *
 * 布局: 日期 + 类型切换 → 金额 → 分类网格/转账账户 → 底部操作
 * 支持: 支出 / 收入 / 转账
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowDown } from 'lucide-react';
import CategoryGrid from '@/shared/components/CategoryGrid';
import { BottomSheet, SheetOption } from '@/shared/components/BottomSheet';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import type { TransactionType } from '@/core/types';
import type { UUID } from '@/core/types';
import { todayLocal, nowTimeLocal } from '@/core/datetime';
import { getAppContext } from '@/data/init';

export default function TransactionForm({ defAccountId }: { defAccountId?: string | null }) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const createTransaction = useTransactionStore((s) => s.createTransaction);
  const transactions = useTransactionStore((s) => s.transactions);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState<UUID | null>(null);
  const [accountId, setAccountId] = useState<UUID>(defAccountId ?? '');
  const [toAccountId, setToAccountId] = useState<UUID>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateStr, setDateStr] = useState(todayLocal());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | 'main' | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  // 账户余额走 SQL 聚合
  useEffect(() => {
    const { accountRepo } = getAppContext();
    Promise.all(accounts.map(async (a) => [a.id, await accountRepo.getBalance(a.id)] as const))
      .then((entries) => setBalances(Object.fromEntries(entries)));
  }, [accounts, transactions]);

  const amountRef = useRef<HTMLInputElement>(null);
  const amountYuan = parseFloat(amountStr) || 0;
  const typeCategories = categories.filter((c) => c.type === type);
  const accentColor = type === 'expense' ? 'var(--color-expense)' : type === 'income' ? 'var(--color-income)' : 'var(--color-transfer)';
  const curAccount = accounts.find((a) => a.id === (accountId || accounts[0]?.id));

  function handleAmountChange(raw: string) {
    let v = raw.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1]!.length > 2) v = parts[0] + '.' + parts[1]!.slice(0, 2);
    if (v.replace('.', '').length > 9) return;
    setAmountStr(v);
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, '');
    if (!t) { setTagInput(''); return; }
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  const canSave = type === 'transfer'
    ? (amountYuan > 0 && !!accountId && !!toAccountId && accountId !== toAccountId)
    : (amountYuan > 0 && !!categoryId);

  async function handleSave() {
    if (!canSave) return;
    const accId = accountId || accounts[0]?.id;
    if (!accId) return;
    setSaving(true);
    try {
      await createTransaction({
        type, amountInYuan: amountYuan, accountId: accId, categoryId: type === 'transfer' ? null : categoryId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        date: dateStr, time: nowTimeLocal(),
        note: note.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      setAmountStr('');
      setNote('');
      setDateStr(todayLocal());
      setTags([]);
      setTagInput('');
      if (type === 'transfer') setToAccountId('');
    } catch {
      useToast.getState().error('保存失败，请重试');
    }
    setSaving(false);
  }

  const displayAmount = amountStr
    ? (() => {
        const parts = amountStr.split('.');
        return Number(parts[0]).toLocaleString() + (parts[1] !== undefined ? '.' + parts[1] : amountStr.endsWith('.') ? '.' : '');
      })()
    : '';

  const dateObj = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const isToday = dateStr === todayLocal();

  return (
    <div style={{ background: 'var(--color-card)', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
      {/* Header: 日期 + 类型切换 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 24px 0',
      }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 6 }}>
            {`${dateObj.getMonth() + 1}月${dateObj.getDate()}日`}
            {!isToday && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 6px', borderRadius: 6 }}>
                补记
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            星期{weekdays[dateObj.getDay()]}
          </div>
          {/* 透明日期选择器覆盖 */}
          <input
            type="date"
            value={dateStr}
            onChange={(e) => e.target.value && setDateStr(e.target.value)}
            style={{
              position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer',
              width: '100%', height: '100%',
            }}
          />
        </div>

        {/* 分段控制器 */}
        <div style={{
          display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 2,
        }}>
          <SegBtn active={type === 'expense'} onClick={() => { setType('expense'); setCategoryId(null); }}>
            支出
          </SegBtn>
          <SegBtn active={type === 'income'} onClick={() => { setType('income'); setCategoryId(null); }}>
            收入
          </SegBtn>
          <SegBtn active={type === 'transfer'} onClick={() => { setType('transfer'); setCategoryId(null); }}>
            转账
          </SegBtn>
        </div>
      </div>

      {/* 金额输入区 */}
      <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
        <div style={{
          position: 'relative', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, width: '100%', minHeight: 56,
        }}>
          {/* ¥ 符号 + 数字 + 光标 整体居中 */}
          <span style={{
            fontSize: 48, fontWeight: 700,
            color: amountStr ? accentColor : '#D1D1D6',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -1,
            lineHeight: 1.15,
            transition: 'color 180ms ease',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 32, fontWeight: 500, marginRight: 4 }}>
              ¥
            </span>
            {displayAmount || '0'}
          </span>
          {/* 闪烁光标 — 紧跟数字后 */}
          <div style={{
            width: 2.5, height: 40,
            backgroundColor: accentColor,
            borderRadius: 1.5,
            marginLeft: 3,
            alignSelf: 'center',
            animation: 'blink 1s step-end infinite',
          }} />
          {/* 隐藏输入 */}
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{
              position: 'absolute', inset: 0,
              opacity: 0, cursor: 'text',
              border: 'none', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 转账：源账户 → 目标账户；收支：分类网格 */}
      {type === 'transfer' ? (
        <div style={{
          borderTop: '1px solid var(--color-divider)',
          padding: '20px 20px 8px',
        }}>
          <div style={{
            fontSize: 13, color: 'var(--color-text-tertiary)',
            marginBottom: 12, paddingLeft: 4, fontWeight: 500, letterSpacing: 0.3,
          }}>
            转账账户
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 转出卡片 */}
            <AccountCard
              account={accounts.find((a) => a.id === (accountId || accounts[0]?.id))}
              label="转出"
              balance={balances[accountId || accounts[0]?.id || ''] ?? 0}
              onClick={() => setPickerTarget('from')}
            />
            <ArrowDown size={18} color="var(--color-transfer)" style={{ flexShrink: 0 }} />
            {/* 转入卡片 */}
            <AccountCard
              account={accounts.find((a) => a.id === toAccountId)}
              label="转入"
              balance={toAccountId ? (balances[toAccountId] ?? 0) : null}
              onClick={() => setPickerTarget('to')}
              placeholder="选择账户"
            />
          </div>
        </div>
      ) : (
        <div style={{
          borderTop: '1px solid var(--color-divider)',
          padding: '20px 16px 8px',
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: 13, color: 'var(--color-text-tertiary)',
            marginBottom: 10, paddingLeft: 4, fontWeight: 500, letterSpacing: 0.3,
          }}>
            选择分类
          </div>
          <CategoryGrid key={type} categories={typeCategories} selectedId={categoryId} onSelect={setCategoryId} />
        </div>
      )}

      {/* 标签 */}
      <div style={{ borderTop: '1px solid var(--color-divider)', padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {tags.map((t) => (
            <span key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'var(--color-primary-light)', color: '#2BAF9F', fontSize: 12,
              padding: '3px 8px', borderRadius: 12, fontWeight: 500,
            }}>
              #{t}
              <button onClick={() => removeTag(t)} style={{
                border: 'none', background: 'transparent', color: '#2BAF9F',
                cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            onBlur={() => { if (tagInput) addTag(tagInput); }}
            placeholder={tags.length === 0 ? '标签（空格分隔）' : '继续添加'}
            style={{
              flex: 1, minWidth: 80, border: 'none', outline: 'none',
              fontSize: 12, padding: '6px 0', background: 'transparent', color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* 底部操作区 */}
      <div style={{
        borderTop: '1px solid var(--color-divider)',
        padding: '12px 12px 16px',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* 账户选择（转账时隐藏，转账在中间区域已选） */}
        {type !== 'transfer' && (
          <button
            onClick={() => setPickerTarget('main')}
            style={{
              flexShrink: 0, maxWidth: '40%', minWidth: 76, minHeight: 44,
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '11px 10px',
              border: 'none',
              borderRadius: 12,
              background: 'var(--color-bg-secondary)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {curAccount ? `${curAccount.icon ?? ''} ${curAccount.name}`.trim() : '选择账户'}
            </span>
            <ChevronDown size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </button>
        )}

        {/* 备注 — 自适应剩余空间 */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注"
          style={{
            flex: '1 1 80px',
            minWidth: 0,
            padding: '11px 12px',
            border: 'none',
            borderRadius: 12,
            background: 'var(--color-bg-secondary)',
            fontSize: 13,
            outline: 'none',
            color: 'var(--color-text-primary)',
            letterSpacing: 0.2,
          }}
        />

        {/* 保存按钮 — 不压缩 */}
        <button
          className="btn-accent"
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            flex: '0 0 auto',
            background: canSave ? accentColor : undefined,
            letterSpacing: 0.3,
          }}
        >
          {saving ? '...' : '保存'}
        </button>
      </div>

      {/* 账户选择弹层 */}
      {pickerTarget && (
        <AccountPicker
          accounts={pickerTarget === 'to' ? accounts.filter((a) => a.id !== (accountId || accounts[0]?.id)) : accounts}
          selectedId={pickerTarget === 'from' ? (accountId || accounts[0]?.id)
            : pickerTarget === 'to' ? toAccountId
            : (accountId || accounts[0]?.id)}
          onSelect={(id) => {
            if (pickerTarget === 'to') setToAccountId(id);
            else setAccountId(id);
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}

function AccountCard({ account, label, balance, onClick, placeholder }: {
  account: { id: string; name: string; icon: string | null } | undefined;
  label: string;
  balance: number | null;
  onClick: () => void;
  placeholder?: string;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, border: '1px solid var(--color-border)', borderRadius: 14,
      background: 'var(--color-bg-secondary)', padding: '14px 12px', cursor: 'pointer',
      textAlign: 'left', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 10, color: '#B0B0B0', marginBottom: 6 }}>{label}</div>
      {account ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.icon ?? ''} {account.name}
          </div>
          {balance !== null && (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              ¥{(balance / 100).toFixed(2)}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: '#C0C0C0' }}>{placeholder ?? '选择账户'}</div>
      )}
    </button>
  );
}

function AccountPicker({ accounts, selectedId, onSelect, onClose }: {
  accounts: { id: string; name: string; icon: string | null }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet title="选择账户" onClose={onClose}>
      {accounts.map((a) => (
        <SheetOption
          key={a.id}
          icon={<span style={{ fontSize: 20 }}>{a.icon ?? '💳'}</span>}
          label={a.name}
          selected={a.id === selectedId}
          onSelect={() => onSelect(a.id)}
        />
      ))}
    </BottomSheet>
  );
}

function SegBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', border: 'none', borderRadius: 9,
      background: active ? 'var(--color-card)' : 'transparent',
      color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
      fontWeight: active ? 600 : 400,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 200ms ease',
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
      boxShadow: active ? 'var(--shadow-seg)' : 'none',
    }}>
      {children}
    </button>
  );
}
