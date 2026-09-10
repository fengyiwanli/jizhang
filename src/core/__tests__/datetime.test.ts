/**
 * datetime 工具测试（格式与本地↔UTC 往返）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayLocal, nowTimeLocal, todayUTC,
  toLocalDateStr, toLocalTimeStr, localDateToUTC,
} from '../datetime.ts';

test('todayLocal: YYYY-MM-DD 且等于本地今天', () => {
  const s = todayLocal();
  assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  const d = new Date();
  const expect = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(s, expect);
});

test('nowTimeLocal: HH:mm:ss', () => {
  assert.match(nowTimeLocal(), /^\d{2}:\d{2}:\d{2}$/);
});

test('todayUTC: YYYY-MM-DD', () => {
  assert.match(todayUTC(), /^\d{4}-\d{2}-\d{2}$/);
});

test('localDateToUTC → 本地字符串往返一致', () => {
  const utc = localDateToUTC('2026-09-10', '12:30');
  assert.match(utc, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(toLocalDateStr(utc), '2026-09-10');
  assert.equal(toLocalTimeStr(utc), '12:30');
});

test('localDateToUTC: 省略时间时仍可往返日期', () => {
  const utc = localDateToUTC('2026-01-01');
  assert.equal(toLocalDateStr(utc), '2026-01-01');
});

test('跨天边界: 23:59 与 00:01 分属不同本地日期', () => {
  const a = localDateToUTC('2026-03-01', '23:59');
  const b = localDateToUTC('2026-03-02', '00:01');
  assert.equal(toLocalDateStr(a), '2026-03-01');
  assert.equal(toLocalDateStr(b), '2026-03-02');
  assert.ok(a < b || a > b); // 均为合法 ISO，仅验证可比较
});
