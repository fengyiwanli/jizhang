/**
 * MoneyUtils 边界测试（分/元转换与展示）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoneyUtils } from '../types.ts';

test('fromYuan: 元转分四舍五入', () => {
  assert.equal(MoneyUtils.fromYuan(0), 0);
  assert.equal(MoneyUtils.fromYuan(12.34), 1234);
  assert.equal(MoneyUtils.fromYuan(0.1 + 0.2), 30); // 浮点误差被 round 吸收
  assert.equal(MoneyUtils.fromYuan(-5.5), -550);
  assert.equal(MoneyUtils.fromYuan(1000000), 100000000);
});

test('toYuan: 分转元', () => {
  assert.equal(MoneyUtils.toYuan(0), 0);
  assert.equal(MoneyUtils.toYuan(1234), 12.34);
  assert.equal(MoneyUtils.toYuan(-550), -5.5);
});

test('format: 千分位与负号', () => {
  assert.equal(MoneyUtils.format(0), '¥0.00');
  assert.equal(MoneyUtils.format(123456), '¥1,234.56');
  assert.equal(MoneyUtils.format(-500), '-¥5.00');
  assert.equal(MoneyUtils.format(1), '¥0.01');
});

test('加减法保持整数分', () => {
  assert.equal(MoneyUtils.add(1299, 1), 1300);
  assert.equal(MoneyUtils.add(0, 0), 0);
  assert.equal(MoneyUtils.subtract(1300, 1), 1299);
  assert.equal(MoneyUtils.subtract(0, 100), -100);
});
