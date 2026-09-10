/**
 * 首启功能引导（B-3）
 *
 * 每个 Tab 首次进入显示一次轻量提示（3 秒自动消失 / 点击关闭），
 * 用 settings 表标记是否看过；设置页可"重新查看引导"。
 */
import { useEffect, useState } from 'react';
import { services } from '@/data/services';

export const GUIDE_KEYS = {
  home: 'guide_home_seen',
  bills: 'guide_bills_seen',
  stats: 'guide_stats_seen',
} as const;

export type GuideTopic = keyof typeof GUIDE_KEYS;

export default function FeatureGuide({ topic, text }: { topic: GuideTopic; text: string }) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    services.settings.get(GUIDE_KEYS[topic])
      .then((v) => { if (alive) { setVisible(!v); setChecked(true); } })
      .catch(() => { if (alive) setChecked(true); });
    return () => { alive = false; };
  }, [topic]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    setVisible(false);
    void services.settings.set(GUIDE_KEYS[topic], '1');
  }

  if (!checked || !visible) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', justifyContent: 'center', zIndex: 900, pointerEvents: 'none',
      }}
    >
      <div style={{
        pointerEvents: 'auto', maxWidth: 320, margin: '0 16px',
        background: 'rgba(26,26,46,0.92)', color: '#fff',
        borderRadius: 14, padding: '10px 14px',
        fontSize: 12.5, lineHeight: 1.5,
        boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
        animation: 'toastIn 0.25s ease',
      }}>
        <span style={{ marginRight: 6 }}>💡</span>
        {text}
        <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 3 }}>点击关闭 · 只提示一次</div>
      </div>
    </div>
  );
}
