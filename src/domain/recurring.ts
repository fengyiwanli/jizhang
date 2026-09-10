/**
 * 周期规则纯逻辑（domain，N-3：从 repository 下沉，便于单测）
 */
import type { Frequency } from '@/domain/entities/Recurring';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
};

export function frequencyLabel(f: Frequency): string {
  return FREQUENCY_LABELS[f] ?? f;
}

/** 目标年月的最后一天 */
function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** 推进下一个执行日期（YYYY-MM-DD 字符串）；月末自动收敛（1/31 + 1 月 → 2/28） */
export function advanceNextRun(current: string, frequency: Frequency, interval: number): string {
  const d = new Date(current + 'T00:00:00');
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + interval);
      return fmt(d);
    case 'weekly':
      d.setDate(d.getDate() + 7 * interval);
      return fmt(d);
    case 'monthly': {
      const year = d.getFullYear();
      const month0 = d.getMonth();
      const day = d.getDate();
      const total = month0 + interval;
      const ny = year + Math.floor(total / 12);
      const nm0 = ((total % 12) + 12) % 12;
      const nd = Math.min(day, lastDayOfMonth(ny, nm0 + 1));
      return `${ny}-${String(nm0 + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
    }
    case 'yearly': {
      const ny = d.getFullYear() + interval;
      const nd = Math.min(d.getDate(), lastDayOfMonth(ny, d.getMonth() + 1));
      return `${ny}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
    }
  }
}
