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

/** 格式化时间为本地可读字符串（跟随用户 locale） */
export function formatTime(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 格式化日期为本地短日期 */
export function formatDate(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

