# ADR-002 用 React + Capacitor 统一三端

- 状态：已接受
- 日期：2026-09-10

## 背景
需要同时覆盖 Web / Android（iOS 可选），团队只有一名独立开发者。

## 决策
- 单一 React + TypeScript + Vite 代码库；Capacitor 负责打包 Android。
- 平台差异通过 Capacitor 插件在运行时判定（如 `Capacitor.isNativePlatform()`），而非多套代码。

## 后果
- 优点：一套代码三端、迭代快、UI 完全可控。
- 代价：依赖 WebView 性能与原生能力边界；后台/返回键等需显式处理（已处理）。
- 相关：`@capacitor/app` 用于返回键与前后台事件。
