/**
 * 轻量数据失效通知（A-1）
 *
 * 所有写操作经 data/services.ts 统一 emit，页面用 useDataVersion(topic) 订阅后重新加载，
 * 解决"改完数据其它页面不刷新、只能靠 key 重挂载"的问题。
 */
export type DataTopic =
  | 'transactions'
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'recurring'
  | 'settings';

type Listener = () => void;

const listeners = new Map<DataTopic, Set<Listener>>();

export const dataEvents = {
  emit(topic: DataTopic): void {
    const set = listeners.get(topic);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try { cb(); } catch { /* 单个订阅者异常不影响其它 */ }
    }
  },

  subscribe(topic: DataTopic, cb: Listener): () => void {
    let set = listeners.get(topic);
    if (!set) { set = new Set(); listeners.set(topic, set); }
    set.add(cb);
    return () => { set!.delete(cb); };
  },
};
