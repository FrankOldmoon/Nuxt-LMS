import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'

/**
 * site 配置（拍平存储）
 *
 * 每个 key 独立存为 configs 表一行（id = 带点 key，value = 标量 jsonb）。
 * 由 settingsModal 读写，启动插件播种默认值。
 *
 * 内存缓存 _cache: Map<key, value>，reloadConfig() 重新加载。
 */
export const DEFAULT_SITE_CONFIG: Record<string, any> = {
  // 站点基础
  'site:title': 'AI LMS',
  'site:description': '',
  'site:keywords': '',
  'site:logo': '',
  'site:favicon': '',
  'site:footerText': '',
  'site:defaultLocale': 'en',
  'site:timezone': '',
  'site:pageSize': 20,
  'site:maxFileSize': 50,
  'site:allowedFileTypes': '',
  'site:maintenanceMode': false,
  // 账号安全
  'site:allowRegistration': false,
  'site:allowForgotPassword': true,
  'site:defaultUserRole': 'student',
  'site:passwordMinLength': 6,
  'site:sessionMaxAge': 604800,
  'site:loginMaxAttempts': 0,
  'site:loginLockoutMinutes': 15,
  // 网盘配额
  'site:driveQuota': 1073741824,
  'site:teacherDriveMultiplier': 1,
  // 邮件
  'site:mail.host': '',
  'site:mail.port': 465,
  'site:mail.secure': true,
  'site:mail.user': '',
  'site:mail.pass': '',
  'site:mail.from': '',
  'site:mail.siteUrl': '',
  // 前端页面显示控制（拍平）
  'site:showNotify': true,
  'site:showMsg': true,
  'site:showMyFiles': true,
}

// 内存缓存
const _cache = new Map<string, any>()
let _loaded = false

/**
 * 重新从数据库加载所有 site:* 配置并更新缓存
 *
 * mail 配置支持从 .env 环境变量读取（优先级高于数据库）：
 *   MAIL_HOST / MAIL_PORT / MAIL_SECURE / MAIL_USER / MAIL_PASS / MAIL_FROM / SITE_URL
 */
export async function reloadConfig(): Promise<Record<string, any>> {
  try {
    const rows = await db
      .select({ id: schema.configs.id, value: schema.configs.value })
      .from(schema.configs)
      .where(like(schema.configs.id, 'site:%'))

    _cache.clear()
    // 以默认值为底
    for (const [key, val] of Object.entries(DEFAULT_SITE_CONFIG)) {
      _cache.set(key, val)
    }
    // DB 值覆盖
    for (const row of rows) {
      if (row.value !== undefined && row.value !== null) {
        _cache.set(row.id, row.value)
      }
    }
  } catch (e) {
    console.error('[config] 加载失败，使用默认配置', e)
    _cache.clear()
    for (const [key, val] of Object.entries(DEFAULT_SITE_CONFIG)) {
      _cache.set(key, val)
    }
  }

  // 环境变量覆盖 mail 配置（优先级最高，留空则保持数据库/默认值）
  const env = process.env
  if (env.MAIL_HOST) _cache.set('site:mail.host', env.MAIL_HOST)
  if (env.MAIL_PORT) _cache.set('site:mail.port', Number(env.MAIL_PORT) || _cache.get('site:mail.port'))
  if (env.MAIL_SECURE !== undefined) _cache.set('site:mail.secure', env.MAIL_SECURE !== 'false')
  if (env.MAIL_USER) _cache.set('site:mail.user', env.MAIL_USER)
  if (env.MAIL_PASS) _cache.set('site:mail.pass', env.MAIL_PASS)
  if (env.MAIL_FROM) _cache.set('site:mail.from', env.MAIL_FROM)
  if (env.SITE_URL) _cache.set('site:mail.siteUrl', env.SITE_URL)

  _loaded = true
  return getConfigSync()
}

/**
 * 异步获取配置（未加载则先加载）
 * 传 key 返回单值，不传返回整个配置对象副本
 */
export async function getConfig(key?: string): Promise<any> {
  if (!_loaded) await reloadConfig()
  if (key !== undefined) return _cache.get(key) ?? DEFAULT_SITE_CONFIG[key]
  return getConfigSync()
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

/**
 * 获取指定前缀下所有配置（去掉前缀）
 * @example getConfigByPrefix('site:mail') → { host, port, secure, user, pass, from, siteUrl }
 */
export async function getConfigByPrefix(prefix: string): Promise<Record<string, any>> {
  if (!_loaded) await reloadConfig()
  const result: Record<string, any> = {}
  for (const [k, v] of _cache) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = v
    }
  }
  return result
}
