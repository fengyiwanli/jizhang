/**
 * Toast 通知 Hook — 全局消息提示
 *
 * 支持 success / error / info；支持带操作按钮（如「撤销」）与自定义停留时长。
 */
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  /** 显示一条 toast；带 action 时默认停留 5s */
  show: (message: string, type?: ToastType, opts?: { action?: ToastAction; duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** 撤销型提示：右侧「撤销」按钮，5 秒内有效 */
  undo: (message: string, onUndo: () => void) => void;
  dismiss: (id: string) => void;
}

let nextId = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = 'info', opts) => {
    const id = String(++nextId);
    const duration = opts?.duration ?? (opts?.action ? 5000 : 2500);
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action: opts?.action, duration }] }));
    setTimeout(() => get().dismiss(id), duration);
  },

  success: (message) => get().show(message, 'success'),
  error: (message) => get().show(message, 'error'),
  info: (message) => get().show(message, 'info'),

  undo: (message, onUndo) => get().show(message, 'info', {
    action: { label: '撤销', onClick: onUndo },
    duration: 5000,
  }),

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
