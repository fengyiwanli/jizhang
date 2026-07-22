/**
 * UUID v7 生成器
 *
 * UUID v7 格式: XXXXXXXX-XXXX-7XXX-XXXX-XXXXXXXXXXXX
 *   - 前 48 bits: Unix 时间戳 (毫秒)
 *   - 版本: 0x7
 *   - 剩余: 随机数 (高安全性)
 *
 * 约束 13.2 第3条: 使用 UUID v7，客户端生成，时间有序
 */
import type { UUID } from './types';

/** 获取当前 UTC 毫秒时间戳 */
function getTimestamp(): number {
  return Date.now();
}

/** 生成一个随机的 UUID (v4) 作为 fallback */
function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * UUID v7 字节数组转字符串
 */
function bytesToUUID(bytes: number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/**
 * 生成 UUID v7
 *
 * 基于 RFC 9562:
 * - 前 48 bits: Unix 时间戳 (毫秒，big-endian)
 * - 接下来 4 bits: 版本号 0x7
 * - 剩下 12 bits (60-71): 随机数高12位，但按标准应置为随机
 * - 变体 bits (80-81): 10
 * - 剩余 62 bits: 随机数
 */
export function generateUUID(): UUID {
  const ts = getTimestamp(); // 毫秒时间戳

  // 获取随机字节
  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = (Math.random() * 256) | 0;
    }
  }

  // 构造 16 字节 UUID
  const bytes = new Array(16);

  // bytes 0-5: 48-bit 时间戳 (毫秒，big-endian)
  bytes[0] = (ts >> 40) & 0xff;
  bytes[1] = (ts >> 32) & 0xff;
  bytes[2] = (ts >> 24) & 0xff;
  bytes[3] = (ts >> 16) & 0xff;
  bytes[4] = (ts >> 8) & 0xff;
  bytes[5] = ts & 0xff;

  // bytes 6-7: 随机，但版本位置为 0x7 (0111 xxxx)
  bytes[6] = (randomBytes[0] & 0x0f) | 0x70;
  bytes[7] = randomBytes[1];

  // bytes 8: 变体 10xx xxxx
  bytes[8] = (randomBytes[2] & 0x3f) | 0x80;

  // bytes 9-15: 随机
  bytes[9] = randomBytes[3];
  bytes[10] = randomBytes[4];
  bytes[11] = randomBytes[5];
  bytes[12] = randomBytes[6];
  bytes[13] = randomBytes[7];
  bytes[14] = randomBytes[8];
  bytes[15] = randomBytes[9];

  return bytesToUUID(bytes) as UUID;
}

/**
 * 生成 client_id (幂等键)
 * 与 UUID v7 同格式，用于防重复提交
 */
export function generateClientId(): UUID {
  return generateUUID();
}

/**
 * 生成任意 UUID (向后兼容 v4 fallback)
 */
export function generateUUIDv4(): string {
  return v4();
}
