/**
 * site 配置 - 重新加载 / 异步获取 / 按前缀查询
 */
import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'
import {
  resetCacheToDefaults,
  setCacheEntry,
  markLoaded,
  isLoaded,
  clearCache,
  getCacheEntry,
  getConfigSync,
} from './state'

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

    resetCacheToDefaults()
    for (const row of rows) {
      if (row.value !== undefined && row.value !== null) {
        setCacheEntry(row.id, row.value)
      }
    }
  } catch (e) {
    console.error('[config] 加载失败，使用默认配置', e)
    clearCache()
    resetCacheToDefaults()
  }

  // 环境变量覆盖 mail 配置（优先级最高，留空则保持数据库/默认值）
  const env = process.env
  if (env.MAIL_HOST) setCacheEntry('site:mail.host', env.MAIL_HOST)
  if (env.MAIL_PORT) setCacheEntry('site:mail.port', Number(env.MAIL_PORT) || getCacheEntry('site:mail.port'))
  if (env.MAIL_SECURE !== undefined) setCacheEntry('site:mail.secure', env.MAIL_SECURE !== 'false')
  if (env.MAIL_USER) setCacheEntry('site:mail.user', env.MAIL_USER)
  if (env.MAIL_PASS) setCacheEntry('site:mail.pass', env.MAIL_PASS)
  if (env.MAIL_FROM) setCacheEntry('site:mail.from', env.MAIL_FROM)
  if (env.SITE_URL) setCacheEntry('site:mail.siteUrl', env.SITE_URL)

  markLoaded()
  return getConfigSync()
}

/**
 * 异步获取配置（未加载则先加载）
 * 传 key 返回单值，不传返回整个配置对象副本
 */
export async function getConfig(key?: string): Promise<any> {
  if (!isLoaded()) await reloadConfig()
  if (key !== undefined) return getConfigSync(key)
  return getConfigSync()
}

/**
 * 获取指定前缀下所有配置（去掉前缀）
 * @example getConfigByPrefix('site:mail') → { host, port, secure, user, pass, from, siteUrl }
 */
export async function getConfigByPrefix(prefix: string): Promise<Record<string, any>> {
  if (!isLoaded()) await reloadConfig()
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(getConfigSync())) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = v
    }
  }
  return result
}
