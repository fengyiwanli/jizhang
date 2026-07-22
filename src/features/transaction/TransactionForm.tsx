/**
 * 记账表单 — 现代极简风格
 *
 * 布局: 日期 + 类型切换 → 金额 → 快捷金额 → 分类网格 → 底部操作
 */
import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import CategoryGrid from '@/shared/components/CategoryGrid';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { useTransactionStore } from '@/features/transaction/store';
import { useToast } from '@/shared/hooks/useToast';
import type { TransactionType } from '@/core/types';
import type { UUID } from '@/core/types';
import { todayUTC, nowTimeUTC } from '@/core/datetime';

export default function TransactionForm({ defAccountId }: { defAccountId?: string | null }) {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const createTransaction = useTransactionStore((s) => s.createTransaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState<UUID | null>(null);
  const [accountId, setAccountId] = useState<UUID>(defAccountId ?? '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const amountYuan = parseFloat(amountStr) || 0;
  const typeCategories = categories.filter((c) => c.type === type && !c.parentId);
  const accentColor = type === 'expense' ? '#E07B6C' : '#5FBB97';

  function handleAmountChange(raw: string) {
    let v = raw.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1]!.length > 2) v = parts[0] + '.' + parts[1]!.slice(0, 2);
    if (v.replace('.', '').length > 9) return;
    setAmountStr(v);
  }

  async function handleSave() {
    if (amountYuan <= 0 || !categoryId) return;
    const accId = accountId || accounts[0]?.id;
    if (!accId) return;
    setSaving(true);
    try {
      await createTransaction({
        type, amountInYuan: amountYuan, accountId: accId, categoryId,
        date: todayUTC(), time: nowTimeUTC(),
        note: note.trim() || undefined,
      });
      setAmountStr('');
      setNote('');
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

  const today = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div style={{ background: '#FFF', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
      {/* Header: 日期 + 类型切换 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 24px 0',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', letterSpacing: -0.3 }}>
            {`${today.getMonth() + 1}月${today.getDate()}日`}
          </div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>
            星期{weekdays[today.getDay()]}
          </div>
        </div>

        {/* 分段控制器 */}
        <div style={{
          display: 'flex', background: '#F5F5F7', borderRadius: 10, padding: 2,
        }}>
          <SegBtn active={type === 'expense'} onClick={() => { setType('expense'); setCategoryId(null); }}>
            支出
          </SegBtn>
          <SegBtn active={type === 'income'} onClick={() => { setType('income'); setCategoryId(null); }}>
            收入
          </SegBtn>
        </div>
      </div>

      {/* 金额输入区 */}
      <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
        <div style={{
          position: 'relative', display: 'inline-flex',
          alignItems: 'baseline', justifyContent: 'center',
          marginBottom: 20,
        }}>
          {/* ¥ 符号 + 数字 + 光标 整体居中 */}
          <span style={{
            fontSize: 48, fontWeight: 700,
            color: amountStr ? accentColor : '#D1D1D6',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -1,
            lineHeight: 1.15,
            transition: 'color 180ms ease',
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

      {/* 分类网格 */}
      <div style={{
        borderTop: '1px solid #F0F0F2',
        padding: '20px 16px 8px',
        maxHeight: 300,
        overflowY: 'auto',
      }}>
        <div style={{
          fontSize: 13, color: '#8E8E93',
          marginBottom: 10, paddingLeft: 4, fontWeight: 500, letterSpacing: 0.3,
        }}>
          选择分类
        </div>
        <CategoryGrid categories={typeCategories} selectedId={categoryId} onSelect={setCategoryId} />
      </div>

      {/* 底部操作区 */}
      <div style={{
        borderTop: '1px solid #F0F0F2',
        padding: '12px 12px 16px',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* 账户选择 — 手机端自适应宽度 */}
        <div style={{ position: 'relative', flex: '0 0 auto', minWidth: 72, maxWidth: 100 }}>
          <select
            value={accountId || (accounts[0]?.id ?? '')}
            onChange={(e) => setAccountId(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 26px 11px 10px',
              border: 'none',
              borderRadius: 12,
              background: '#F5F5F7',
              fontSize: 12,
              color: '#1A1A2E',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.icon ?? ''} {a.name}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            color="#8E8E93"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
        </div>

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
            background: '#F5F5F7',
            fontSize: 13,
            outline: 'none',
            color: '#1A1A2E',
            letterSpacing: 0.2,
          }}
        />

        {/* 保存按钮 — 不压缩 */}
        <button
          onClick={handleSave}
          disabled={amountYuan <= 0 || !categoryId || saving}
          style={{
            flex: '0 0 auto',
            padding: '11px 20px',
            border: 'none',
            borderRadius: 12,
            background: (amountYuan > 0 && categoryId) ? accentColor : '#E8E8ED',
            color: (amountYuan > 0 && categoryId) ? '#FFF' : '#C0C0C0',
            fontSize: 14, fontWeight: 600,
            cursor: (amountYuan > 0 && categoryId && !saving) ? 'pointer' : 'not-allowed',
            transition: 'all 200ms ease',
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? '...' : '保存'}
        </button>
      </div>
    </div>
  );
}

function SegBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', border: 'none', borderRadius: 9,
      background: active ? '#FFF' : 'transparent',
      color: active ? '#1A1A2E' : '#8E8E93',
      fontWeight: active ? 600 : 400,
      fontSize: 13,
      cursor: 'pointer',
      transition: 'all 200ms ease',
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
      letterSpacing: 0.3,
    }}>
      {children}
    </button>
  );
}
