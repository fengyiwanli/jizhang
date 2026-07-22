/**
 * 数字键盘组件
 */
import React from 'react';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
}

export default function NumberPad({ value, onChange, onSubmit }: NumberPadProps) {
  function handleKey(key: string) {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      onChange('');
      return;
    }
    if (key === 'done' && onSubmit) {
      onSubmit();
      return;
    }
    // 小数点限制
    if (key === '.' && value.includes('.')) return;
    // 不能以多个 0 开头
    if (key === '0' && value === '0') return;
    // 限制小数点后两位
    const dotIdx = value.indexOf('.');
    if (dotIdx >= 0 && value.length - dotIdx > 2) return;
    // 限制长度
    if (value.replace('.', '').length >= 9) return;

    const newVal = value === '0' && key !== '.' ? key : value + key;
    onChange(newVal);
  }

  const keys = [
    ['1', '2', '3', 'backspace'],
    ['4', '5', '6', 'clear'],
    ['7', '8', '9', 'done'],
    ['.', '0'],
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      padding: 12,
      background: '#F0F2F5',
      borderRadius: 16,
    }}>
      {keys.map((row, ri) =>
        row.map((key, ki) => {
          if (key === 'done') {
            return (
              <button
                key={key}
                onClick={() => handleKey(key)}
                style={{
                  ...keyBase,
                  background: '#4ECDC4',
                  color: '#FFF',
                  fontWeight: 700,
                  gridRow: 'span 2',
                  fontSize: 18,
                }}
              >
                确定
              </button>
            );
          }
          if (key === 'backspace') {
            return (
              <button key={key} onClick={() => handleKey(key)} style={{ ...keyBase, fontSize: 20 }}>
                ⌫
              </button>
            );
          }
          if (key === 'clear') {
            return (
              <button key={key} onClick={() => handleKey(key)} style={{ ...keyBase, color: '#FF6B6B' }}>
                C
              </button>
            );
          }
          return (
            <NumberKey
              key={`${ri}-${ki}`}
              label={key}
              onClick={() => handleKey(key)}
            />
          );
        }),
      )}
    </div>
  );
}

function NumberKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={keyBase}>
      {label}
    </button>
  );
}

const keyBase: React.CSSProperties = {
  height: 48,
  border: 'none',
  borderRadius: 12,
  background: '#FFFFFF',
  color: '#2C3E50',
  fontSize: 20,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};
