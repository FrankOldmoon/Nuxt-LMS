/**
 * 树 ↔ 拍平 互转 + 深合并工具
 */

/**
 * 将树形对象拍平为 "section.key.sub" 形式的键
 *   flattenTree('', { a: { b: 1, c: 2 } }) => { 'a.b': 1, 'a.c': 2 }
 * 非对象（Date / Array）视为叶子值。
 */
export function flattenTree(prefix: string, obj: any, result: Record<string, any>) {
  if (obj === null || obj === undefined) return
  if (typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    if (prefix) result[prefix] = obj
    return
  }
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      flattenTree(fullKey, val, result)
    } else if (val !== undefined) {
      result[fullKey] = val
    }
  }
}

/**
 * 将 "section.key" 形式的拍平键还原为嵌套树
 *   unflattenTree({ 'a.b': 1, 'a.c': 2 }) => { a: { b: 1, c: 2 } }
 */
export function unflattenTree(flat: Record<string, any>): any {
  const result: any = {}
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined) continue
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]!
      if (!(p in cur) || cur[p] === null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {}
      }
      cur = cur[p]
    }
    cur[parts[parts.length - 1]!] = val
  }
  return result
}

/** 深克隆（简单 JSON 兼容对象） */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/**
 * 深度合并默认配置和数据库配置
 * - target 中存在的 key 优先于 defaults
 * - 不递归 Date / Array（视为叶子）
 */
export function mergeConfig(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  if (defaults === null || typeof defaults !== 'object' || Array.isArray(defaults) || defaults instanceof Date) {
    return overrides === undefined ? defaults : overrides
  }
  const result: any = { ...defaults }
  for (const [key, val] of Object.entries(overrides)) {
    const defVal = (defaults as any)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)
        && defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal) && !(defVal instanceof Date)) {
      result[key] = mergeConfig(defVal, val)
    } else {
      result[key] = val === undefined ? defVal : val
    }
  }
  return result
}

export { deepClone }
