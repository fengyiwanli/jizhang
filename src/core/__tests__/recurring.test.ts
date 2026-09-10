/**
 * 周期推进（advanceNextRun）测试：N-4 覆盖日/周/月/年、interval 与月末收敛
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceNextRun, frequencyLabel } from '../../domain/recurring.ts';

test('daily / weekly 常规推进', () => {
  assert.equal(advanceNextRun('2026-09-10', 'daily', 1), '2026-09-11');
  assert.equal(advanceNextRun('2026-09-10', 'daily', 7), '2026-09-17');
  assert.equal(advanceNextRun('2026-09-10', 'weekly', 1), '2026-09-17');
  assert.equal(advanceNextRun('2026-09-10', 'weekly', 2), '2026-09-24');
});

test('monthly 跨月与跨年', () => {
  assert.equal(advanceNextRun('2026-09-10', 'monthly', 1), '2026-10-10');
  assert.equal(advanceNextRun('2026-12-10', 'monthly', 1), '2027-01-10');
  assert.equal(advanceNextRun('2026-11-30', 'monthly', 3), '2027-02-28');
});

test('monthly 月末收敛：1/31 + 1 月 → 2/28（非闰年）', () => {
  assert.equal(advanceNextRun('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(advanceNextRun('2024-01-31', 'monthly', 1), '2024-02-29'); // 闰年
  assert.equal(advanceNextRun('2026-03-31', 'monthly', 1), '2026-04-30');
});

test('yearly 推进与 2/29 收敛', () => {
  assert.equal(advanceNextRun('2026-09-10', 'yearly', 1), '2027-09-10');
  assert.equal(advanceNextRun('2024-02-29', 'yearly', 1), '2025-02-28');
  assert.equal(advanceNextRun('2024-02-29', 'yearly', 4), '2028-02-29');
});

test('frequencyLabel 文案', () => {
  assert.equal(frequencyLabel('daily'), '每天');
  assert.equal(frequencyLabel('monthly'), '每月');
});
