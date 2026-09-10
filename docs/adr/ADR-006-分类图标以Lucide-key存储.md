# ADR-006 分类图标以 Lucide key 存储

- 状态：已接受
- 日期：2026-09-10

## 背景
早期分类 icon 存 emoji，展示时却按分类名去猜 Lucide 图标，导致「选了咖啡显示闪电」。

## 决策
- 新建/编辑分类时，`icon` 字段存 Lucide 组件导出名（如 `Coffee`）。
- 展示统一走 `resolveCategoryIcon(cat)`：先按 key 取组件 → 老 emoji 数据按名称映射 → 兜底 Zap。
- 老数据不迁移，编辑一次即自动升级为 key。

## 后果
- 优点：所见即所得；图标集可扩展（ICON_CHOICES 分组）。
- 代价：跨端（Web/Android）需保证 lucide-react 版本一致。
