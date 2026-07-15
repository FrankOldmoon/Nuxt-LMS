/**
 * LMS config - private cache state
 *
 * Module-level singleton, accessed externally via reloadLmsConfig / getLmsConfigSync.
 */
import { DEFAULT_LMS_CONFIG } from '../defaults'
import { flattenTree, deepClone } from '../tree'

/** Flattened defaults (key='a.b.c' without lms: prefix) */
export const FLAT_DEFAULTS: Record<string, any> = (() => {
  const r: Record<string, any> = {}
  flattenTree('', DEFAULT_LMS_CONFIG, r)
  return r
})()

/** Tree-shaped in-memory cache */
let _lmsConfig: any = null

export function getRaw(): any { return _lmsConfig }
export function setLoaded(cfg: any) { _lmsConfig = cfg }
export function resetCache() { _lmsConfig = null }

/** Synchronously get the cached config (returns a clone of defaults when not loaded) */
export function getLmsRawConfig(): any {
  return _lmsConfig ? _lmsConfig : deepClone(DEFAULT_LMS_CONFIG)
}
