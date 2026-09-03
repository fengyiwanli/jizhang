/**
 * 列表行长按 hook（600ms），用于"长按编辑账单"。
 * 每个使用方只需一个实例（单指操作），start 后到点触发回调，移动/松开取消。
 */
import { useRef } from 'react';

export default function useRowLongPress(duration = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  };

  const onStart = (fn: () => void) => () => {
    clear();
    timer.current = setTimeout(fn, duration);
  };

  const onCancel = () => clear();

  return { onStart, onCancel };
}
