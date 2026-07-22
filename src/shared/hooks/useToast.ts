/**
 * Toast 通知 Hook — 全局消息提示
 *
 * 轻量实现，不依赖外部库。
 * 支持 success / error / info 三种类型。
 */
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  /** 显示一条 toast，2.5s 后自动消失 */
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

let nextId = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = 'info') => {
    const id = String(++nextId);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().dismiss(id), 2500);
  },

  success: (message) => get().show(message, 'success'),
  error: (message) => get().show(message, 'error'),
  info: (message) => get().show(message, 'info'),

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
