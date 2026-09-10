/**
 * useDataVersion — 订阅数据失效通知（A-1）
 *
 * 用法：
 *   const v = useDataVersion('transactions');
 *   useEffect(() => { load(); }, [v, ...]);
 * 写操作经 services 后会自动 emit，订阅页面即可自动刷新，无需切 Tab / key 重挂载。
 */
import { useEffect, useState } from 'react';
import { dataEvents, type DataTopic } from '@/data/dataEvents';

export function useDataVersion(topic: DataTopic): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const off = dataEvents.subscribe(topic, () => setVersion((v) => v + 1));
    return off;
  }, [topic]);
  return version;
}

export default useDataVersion;
