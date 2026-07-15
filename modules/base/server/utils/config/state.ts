/**
 * Site config - in-memory cache (private state owner)
 *
 * _cache / _loaded are module-level singletons; other sub-modules (reload) access via
 * the read/write functions of this file, avoiding state fragmentation from duplicate Map instances.
 */
import { DEFAULT_SITE_CONFIG } from './defaults'

// Module-level private cache
const _cache = new Map<string, any>()
let _loaded = false

/** Internal: clear and reset to defaults (for reload) */
export function resetCacheToDefaults() {
  _cache.clear()
  for (const [key, val] of Object.entries(DEFAULT_SITE_CONFIG)) {
    _cache.set(key, val)
  }
}

/** Internal: write a config entry (for reload) */
export function setCacheEntry(key: string, value: any) {
  _cache.set(key, value)
}

/** Internal: mark as loaded (for reload) */
export function markLoaded() {
  _loaded = true
}

/** Internal: check if loaded */
export function isLoaded(): boolean {
  return _loaded
}

/** Internal: clear cache (for reload failure fallback) */
export function clearCache() {
  _cache.clear()
}

/** Internal: read single entry (for reload env override) */
export function getCacheEntry(key: string): any {
  return _cache.get(key)
}

/**
 * Sync get cached config (returns default value if not loaded)
 * Pass key to return a single value, omit to return a copy of the entire config object
 */
export function getConfigSync(key?: string): any {
  if (key !== undefined) {
    return _cache.get(key) ?? DEFAULT_SITE_CONFIG[key]
  }
  const result: Record<string, any> = {}
  for (const [k, v] of _cache) result[k] = v
  return result
}
