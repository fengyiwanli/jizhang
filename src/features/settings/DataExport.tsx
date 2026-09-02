/**
 * 数据导出组件 — CSV / JSON 格式下载
 */
import { useState } from 'react';
import { getAppContext } from '@/data/init';
import { useCategoryStore } from '@/features/category/store';
import { useAccountStore } from '@/features/account/store';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

export default function DataExport() {
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function exportCSV() {
    setExporting(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, limit: 99999 });

    const header = '日期,时间,类型,金额,分类,账户,备注,标签';
    const rows = txs.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const acc = accounts.find((a) => a.id === t.accountId);
      const amount = (t.type === 'expense' ? -t.amount : t.amount) / 100;
      return [
        t.date,
        t.time ?? '',
        t.type === 'expense' ? '支出' : t.type === 'income' ? '收入' : '转账',
        amount.toFixed(2),
        cat?.name ?? '',
        acc?.name ?? '',
        `"${(t.note ?? '').replace(/"/g, '""')}"`,
        `"${JSON.parse(t.tags || '[]').join(';')}"`,
      ].join(',');
    });

    download(`记账数据_${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + [header, ...rows].join('\n'), 'text/csv');
    setExporting(false);
    setDone('CSV 已导出');
  }

  async function exportJSON() {
    setExporting(true);
    const { transactionRepo } = getAppContext();
    const txs = await transactionRepo.list({ ledgerId: DEFAULT_LEDGER_ID, limit: 99999 });

    const data = txs.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const acc = accounts.find((a) => a.id === t.accountId);
      return {
        id: t.id,
        date: t.date,
        time: t.time,
        type: t.type,
        amount: (t.type === 'expense' ? -t.amount : t.amount) / 100,
        category: cat?.name ?? null,
        account: acc?.name ?? null,
        note: t.note || null,
        tags: JSON.parse(t.tags || '[]'),
        createdAt: t.createdAt,
      };
    });

    download(
      `记账数据_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportTime: new Date().toISOString(), count: data.length, transactions: data }, null, 2),
      'application/json',
    );
    setExporting(false);
    setDone('JSON 已导出');
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>数据导出</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={exportCSV} disabled={exporting} style={{ flex: 1, minHeight: 44 }}>
          📄 导出 CSV
        </button>
        <button
          className="btn-pill"
          onClick={exportJSON}
          disabled={exporting}
          style={{ flex: 1, minHeight: 44, fontSize: 13 }}
        >
          📋 导出 JSON
        </button>
      </div>
      {done && (
        <p style={{
          fontSize: 12, color: 'var(--color-success)', marginTop: 6, marginBottom: 0,
        }}>
          ✅ {done}
        </p>
      )}
    </div>
  );
}

