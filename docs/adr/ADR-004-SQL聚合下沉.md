# ADR-004 统计聚合下沉到 SQL

- 状态：已接受
- 日期：2026-09-10

## 背景
早期统计在前端对所有交易做 reduce，数据量增长后卡顿且口径容易不一致。

## 决策
- 汇总类计算（余额、月度收支、分类构成、日/月趋势）一律写 SQL 聚合，放在 `StatsRepository` / `AccountRepository.getBalance`。
- UI 只取结果，不遍历 transactions 计算金额。

## 后果
- 优点：性能稳定、口径唯一（例如 expense 口径只在 SQL 定义一次）。
- 代价：SQL 可测性依赖数据库测试（当前单测覆盖不足，属待补项）。
