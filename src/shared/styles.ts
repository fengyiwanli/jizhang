/**
 * 通用 UI 样式片段，避免重复定义
 */

/** 单行文本溢出省略 */
export const ellipsis: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/** flex 行左侧自适应收缩 */
export const flexLeft: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
} as const;
