/**
 * Tree <-> flat conversion + deep merge utilities
 */

/**
 * Flatten a tree-shaped object into keys of the form "section.key.sub"
 *   flattenTree('', { a: { b: 1, c: 2 } }) => { 'a.b': 1, 'a.c': 2 }
 * Non-object values (Date / Array) are treated as leaves.
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
 * Restore flat keys of the form "section.key" into a nested tree
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

/** Deep clone (simple JSON-compatible objects) */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/**
 * Deep merge default config and database config
 * - Keys present in target take priority over defaults
 * - Date / Array values are not recursed into (treated as leaves)
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
