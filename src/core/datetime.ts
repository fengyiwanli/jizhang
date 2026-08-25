/**
 * 时间工具函数
 *
 * 约束 13.2 第6条: 所有时间存储 UTC，展示时转本地时区
 */
import type { UTCDateTime } from './types';

/** 获取当前 UTC ISO 8601 字符串 */
export function nowUTC(): UTCDateTime {
  return new Date().toISOString();
}

/** 获取今天的本地日期字符串 (YYYY-MM-DD) — 记账用 */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 获取当前本地时间字符串 (HH:mm:ss) — 记账用 */
export function nowTimeLocal(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/** 获取今天的 UTC 日期字符串 (YYYY-MM-DD) — 已弃用，请用 todayLocal */
export function todayUTC(): string {
  return todayLocal();
}

/** 获取当前 UTC 时间字符串 (HH:mm:ss) — 已弃用，请用 nowTimeLocal */
export function nowTimeUTC(): string {
  return nowTimeLocal();
}

/** 将 ISO 8601 UTC 字符串转为本地日期展示 */
export function toLocalDateStr(utcStr: UTCDateTime): string {
  const d = new Date(utcStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 将 ISO 8601 UTC 字符串转为本地时间展示 */
export function toLocalTimeStr(utcStr: UTCDateTime): string {
  const d = new Date(utcStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 将 ISO 8601 UTC 字符串转为本地日期时间展示 */
export function toLocalDateTimeStr(utcStr: UTCDateTime): string {
  return `${toLocalDateStr(utcStr)} ${toLocalTimeStr(utcStr)}`;
}

/** 将本地日期转 UTC ISO 8601 */
export function localDateToUTC(dateStr: string, timeStr?: string): UTCDateTime {
  const str = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
  const d = new Date(str);
  return d.toISOString();
}
