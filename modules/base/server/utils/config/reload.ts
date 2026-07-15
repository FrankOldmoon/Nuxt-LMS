/**
 * Site config - reload / async get / query by prefix
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
 * Reload all site:* configs from database and update cache
 *
 * mail config supports reading from .env environment variables (higher priority than database):
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
    console.error('[config] Load failed, using default config', e)
    clearCache()
    resetCacheToDefaults()
  }

  // Environment variables override mail config (highest priority, empty keeps database/default value)
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
 * Async get config (load first if not loaded)
 * Pass key to return a single value, omit to return a copy of the entire config object
 */
export async function getConfig(key?: string): Promise<any> {
  if (!isLoaded()) await reloadConfig()
  if (key !== undefined) return getConfigSync(key)
  return getConfigSync()
}

/**
 * Get all configs under the specified prefix (prefix stripped)
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
