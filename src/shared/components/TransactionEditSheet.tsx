/**
 * 编辑账单底部弹层 — 历史账单修改 / 删除
 *
 * 供「账单」页交易行点击打开；字段完整回填，保存/删除走 transaction store。
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BottomSheet, SheetOption } from '@/shared/components/BottomSheet';
import CategoryGrid from '@/shared/components/CategoryGrid';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import type { Transaction } from '@/domain/entities/Transaction';
import type { TransactionType } from '@/core/types';
import { todayLocal } from '@/core/datetime';

interface Props {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

function parseTags(tags: string): string[] {
  try {
    const v = JSON.parse(tags);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function TransactionEditSheet({ tx, onClose, onSaved }: Props) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  const [type, setType] = useState<TransactionType>(tx.type);
  const [amountStr, setAmountStr] = useState(String(tx.amount / 100));
  const [categoryId, setCategoryId] = useState<string | null>(tx.categoryId);
  const [accountId, setAccountId] = useState<string>(tx.accountId);
  const [toAccountId, setToAccountId] = useState<string>(tx.toAccountId ?? '');
  const [dateStr, setDateStr] = useState(tx.date || todayLocal());
  const [timeStr, setTimeStr] = useState((tx.time ?? '').slice(0, 5));
  const [note, setNote] = useState(tx.note ?? '');
  const [tags, setTags] = useState<string[]>(parseTags(tx.tags));
  const [tagInput, setTagInput] = useState('');
  const [picker, setPicker] = useState<'account' | 'toAccount' | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const amountYuan = parseFloat(amountStr) || 0;
  const typeCategories = categories.filter((c) => c.type === type);
  const catMissing = !!categoryId && !categories.some((c) => c.id === categoryId);
  const accentColor = type === 'expense' ? 'var(--color-expense)' : type === 'income' ? 'var(--color-income)' : 'var(--color-transfer)';

  const canSave = type === 'transfer'
    ? (amountYuan > 0 && !!accountId && !!toAccountId && accountId !== toAccountId)
    : (amountYuan > 0 && !!categoryId && !!accountId);

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
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  async function handleSave() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const safeTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      await updateTransaction(tx.id, {
        type,
        amountInYuan: amountYuan,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId: type === 'transfer' ? null : categoryId,
        date: dateStr,
        time: safeTime || undefined,
        note: note.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      useToast.getState().success('已保存修改');
      onSaved();
    } catch {
      useToast.getState().error('保存失败，请重试');
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (busy) return;
    setBusy(true);
    try {
      await deleteTransaction(tx.id);
      useToast.getState().success('已删除');
      onSaved();
    } catch {
      useToast.getState().error('删除失败');
      setBusy(false);
    }
  }

  const toCandidates = accounts.filter((a) => a.id !== accountId);
  const fromCandidates = accounts.filter((a) => a.id !== toAccountId || !toAccountId);

  return (
    <BottomSheet title="编辑账单" onClose={onClose}>
      {/* 类型分段 */}
      <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 2, marginBottom: 14 }}>
        {([['expense', '支出'], ['income', '收入'], ['transfer', '转账']] as const).map(([v, label]) => (
          <button key={v} onClick={() => {
            setType(v);
            if (v !== 'transfer') setToAccountId('');
          }} style={{
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
            background: type === v ? 'var(--color-card)' : 'transparent',
            color: type === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontWeight: type === v ? 600 : 400, fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 200ms',
            boxShadow: type === v ? 'var(--shadow-seg)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* 金额 */}
      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>金额</div>
        <input
          type="text" inputMode="decimal"
          value={amountStr}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0.00"
          style={{
            width: '100%', boxSizing: 'border-box', textAlign: 'center',
            fontSize: 32, fontWeight: 700, color: accentColor,
            border: 'none', outline: 'none', background: 'var(--color-bg-secondary)',
            borderRadius: 12, padding: '10px 0', fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>

      {/* 分类 / 转账账户 */}
      {type === 'transfer' ? (
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>转出 → 转入</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PickerTrigger
              text={accounts.find((a) => a.id === accountId)
                ? `${accounts.find((a) => a.id === accountId)!.icon ?? ''} ${accounts.find((a) => a.id === accountId)!.name}`.trim()
                : '选择账户'}
              placeholder={!accountId}
              onClick={() => setPicker('account')}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 16 }}>→</span>
            <PickerTrigger
              text={toAccountId
                ? `${accounts.find((a) => a.id === toAccountId)?.icon ?? ''} ${accounts.find((a) => a.id === toAccountId)?.name ?? ''}`.trim()
                : '选择账户'}
              placeholder={!toAccountId}
              onClick={() => setPicker('toAccount')}
              style={{ flex: 1 }}
            />
          </div>
          {accountId && toAccountId && accountId === toAccountId && (
            <div style={{ fontSize: 11, color: 'var(--color-expense)', marginTop: 4 }}>转出与转入不能是同一账户</div>
          )}
        </div>
      ) : (
        <>
          <div style={labelStyle}>分类</div>
          <div style={{ maxHeight: 190, overflowY: 'auto', marginBottom: 10 }}>
            <CategoryGrid
              key={type}
              categories={typeCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          </div>
          {catMissing && (
            <div style={{ fontSize: 12, color: 'var(--color-expense)', marginBottom: 6 }}>
              原分类已删除，请重新选择分类后再保存
            </div>
          )}
          {/* 账户 */}
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>账户</div>
            <PickerTrigger
              text={accounts.find((a) => a.id === accountId)
                ? `${accounts.find((a) => a.id === accountId)!.icon ?? ''} ${accounts.find((a) => a.id === accountId)!.name}`.trim()
                : '选择账户'}
              placeholder={!accountId}
              onClick={() => setPicker('account')}
            />
          </div>
        </>
      )}

      {/* 日期 + 时间 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>日期</div>
          <input type="date" value={dateStr} max={todayLocal()} onChange={(e) => e.target.value && setDateStr(e.target.value)}
            style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>时间</div>
          <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* 备注 */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>备注</div>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注" style={inputStyle} />
      </div>

      {/* 标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 16 }}>
        {tags.map((t) => (
          <span key={t} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'var(--color-primary-light)', color: '#2BAF9F', fontSize: 12,
            padding: '3px 8px', borderRadius: 12, fontWeight: 500,
          }}>
            #{t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} style={{
              border: 'none', background: 'transparent', color: '#2BAF9F',
              cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
            }}>×</button>
          </span>
        ))}
        <input
          type="text" value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
          }}
          onBlur={() => { if (tagInput) addTag(tagInput); }}
          placeholder={tags.length === 0 ? '标签（空格分隔）' : '继续添加'}
          style={{
            flex: 1, minWidth: 80, border: 'none', outline: 'none',
            fontSize: 12, padding: '6px 0', background: 'transparent',
            color: 'var(--color-text-primary)', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* 按钮行 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className={confirmDelete ? 'btn-danger' : 'btn-secondary'}
          onClick={handleDelete}
          disabled={busy}
          style={confirmDelete ? { flex: 1 } : { flex: 1, color: 'var(--color-expense)', borderColor: 'var(--color-expense)' }}
        >
          {confirmDelete ? '确认删除？' : '删除账单'}
        </button>
        <button className="btn-accent" onClick={handleSave} disabled={!canSave || busy} style={{ flex: 2, background: canSave ? accentColor : undefined }}>
          {busy ? '保存中...' : '保存修改'}
        </button>
      </div>

      {/* 账户选择弹层 */}
      {picker === 'account' && (
        <BottomSheet title="选择转出账户" onClose={() => setPicker(null)}>
          {(type === 'transfer' ? fromCandidates : accounts).map((a) => (
            <SheetOption
              key={a.id}
              icon={<span style={{ fontSize: 18 }}>{a.icon ?? '💳'}</span>}
              label={a.name}
              selected={a.id === accountId}
              onSelect={() => { setAccountId(a.id); setPicker(null); }}
            />
          ))}
        </BottomSheet>
      )}
      {picker === 'toAccount' && (
        <BottomSheet title="选择转入账户" onClose={() => setPicker(null)}>
          {toCandidates.map((a) => (
            <SheetOption
              key={a.id}
              icon={<span style={{ fontSize: 18 }}>{a.icon ?? '💳'}</span>}
              label={a.name}
              selected={a.id === toAccountId}
              onSelect={() => { setToAccountId(a.id); setPicker(null); }}
            />
          ))}
        </BottomSheet>
      )}
    </BottomSheet>
  );
}

function PickerTrigger({ text, placeholder, onClick, style }: {
  text: string; placeholder: boolean; onClick: () => void; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{
      ...style,
      width: style?.flex ? undefined : '100%',
      minHeight: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      padding: '11px 12px',
      border: 'none', borderRadius: 10,
      background: 'var(--color-bg-secondary)',
      fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
      color: placeholder ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
    }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
        {text}
      </span>
      <ChevronDown size={13} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500,
  marginBottom: 6, letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 10,
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
  color: 'var(--color-text-primary)', background: 'var(--color-card)',
};
