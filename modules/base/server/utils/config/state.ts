/**
 * site 配置 - 内存缓存（私有状态所有者）
 *
 * _cache / _loaded 是模块级单例；其他子模块（reload）通过本文件的
 * 读写函数访问，避免重复 Map 实例带来的状态分裂。
 */
import { DEFAULT_SITE_CONFIG } from './defaults'

// 模块级私有缓存
const _cache = new Map<string, any>()
let _loaded = false

/** 内部：清空并按默认值重置（reload 用） */
export function resetCacheToDefaults() {
  _cache.clear()
  for (const [key, val] of Object.entries(DEFAULT_SITE_CONFIG)) {
    _cache.set(key, val)
  }
}

/** 内部：写入一条配置（reload 用） */
export function setCacheEntry(key: string, value: any) {
  _cache.set(key, value)
}

/** 内部：标记已加载（reload 用） */
export function markLoaded() {
  _loaded = true
}

/** 内部：检查是否已加载 */
export function isLoaded(): boolean {
  return _loaded
}

/** 内部：清空缓存（reload 失败回退用） */
export function clearCache() {
  _cache.clear()
}

/** 内部：读取单条（reload env 覆盖用） */
export function getCacheEntry(key: string): any {
  return _cache.get(key)
}

/**
 * 同步获取已缓存的配置（未加载时返回默认值）
 * 传 key 返回单值，不传返回整个配置对象副本
 */
export function getConfigSync(key?: string): any {
  if (key !== undefined) {
    return _cache.get(key) ?? DEFAULT_SITE_CONFIG[key]
  }
  const result: Record<string, any> = {}
  for (const [k, v] of _cache) result[k] = v
  return result
}
