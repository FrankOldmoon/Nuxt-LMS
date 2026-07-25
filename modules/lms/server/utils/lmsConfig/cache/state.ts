/**
 * LMS 配置 - 私有缓存状态
 *
 * 模块级单例，外部通过 reloadLmsConfig / getLmsConfigSync 访问。
 */
import { DEFAULT_LMS_CONFIG } from '../defaults'
import { flattenTree, deepClone } from '../tree'

/** 拍平默认值（key='a.b.c' 不带 lms: 前缀） */
export const FLAT_DEFAULTS: Record<string, any> = (() => {
  const r: Record<string, any> = {}
  flattenTree('', DEFAULT_LMS_CONFIG, r)
  return r
})()

/** 树形内存缓存 */
let _lmsConfig: any = null

export function getRaw(): any { return _lmsConfig }
export function setLoaded(cfg: any) { _lmsConfig = cfg }
export function resetCache() { _lmsConfig = null }

/** 同步获取已缓存的配置（未加载时返回默认值克隆） */
export function getLmsRawConfig(): any {
  return _lmsConfig ? _lmsConfig : deepClone(DEFAULT_LMS_CONFIG)
}
