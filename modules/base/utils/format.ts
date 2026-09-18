/**
 * 格式化工具函数
 */

/**
 * 将后端返回的时间字符串转为本地 Date。
 *
 * 存储链路：DB 用 timestamp（without time zone）存服务器本地墙上时间；
 * pglite/postgres 驱动会按服务器时区把该值解析为 Date，JSON 序列化后
 * 返回带 Z 的 UTC 字符串（如存储 09:00 → 返回 01:00:00Z）。
 * 因此前端应保留 Z，让 new Date 按 UTC 解析、再 toLocaleString 转浏览器
 * 本地时区，才能还原原始墙上时间。若去掉 Z 再按本地解析会二次偏移。
 */
function parseLocalTime(time?: string | null): Date | null {
  if (!time) return null
  return new Date(time)
}

/**
 * 格式化时间为可读字符串。
 * @param timeZone 指定渲染时区（IANA，如 'Asia/Shanghai'）。缺省用浏览器本地时区——
 * 注意 toLocaleString 无 timeZone 时按浏览器/系统时区显示，跨地区查看会不一致；
 * 需要在站点内统一用站点时区（如北京）显示时显式传入。
 */
export function formatTime(time?: string | null, timeZone?: string): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  })
}

/** 格式化日期为可读短日期；timeZone 语义同 formatTime */
export function formatDate(time?: string | null, timeZone?: string): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, timeZone ? { timeZone } : {})
}

