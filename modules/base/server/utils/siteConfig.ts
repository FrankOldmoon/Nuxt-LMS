import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * site_config 默认配置
 *
 * 存储于 configs 表 id='site_config'，由 settingsModal 读写
 * 包含网站基础信息 + 邮件服务配置
 */
export const DEFAULT_SITE_CONFIG = {
  // 网站基础
  siteTitle: 'Nuxt Hub',
  siteDescription: '',
  allowRegistration: true,
  siteLogo: '',
  pageSize: 20,
  // 邮件服务（用于忘记密码等邮件通知）
  mail: {
    host: '',              // SMTP 主机，如 smtp.qq.com
    port: 465,             // SMTP 端口
    secure: true,          // true=465(SSL), false=587(TLS)
    user: '',              // 发件邮箱账号
    pass: '',              // 发件邮箱密码/授权码
    from: '',              // 发件人地址，如 "LMS <noreply@example.com>"
    siteUrl: '',           // 网站根地址，用于拼接重置链接，如 https://lms.example.com
  },
}

// 内存缓存
let _siteConfig: any = null
let _loaded = false

/**
 * 深度合并默认配置和数据库配置
 */
function mergeConfig(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      result[key] = mergeConfig(defaults[key], overrides[key] || {})
    } else {
      result[key] = overrides[key] !== undefined ? overrides[key] : defaults[key]
    }
  }
  return result
}

/**
 * 获取 site_config（带缓存）
 */
export async function getSiteConfig(): Promise<any> {
  if (_loaded && _siteConfig) return _siteConfig
  return reloadSiteConfig()
}

/**
 * 同步获取已缓存的 site_config（未加载时返回默认值）
 */
export function getSiteConfigSync(): any {
  return _siteConfig || DEFAULT_SITE_CONFIG
}

/**
 * 重新从数据库加载 site_config 并更新缓存
 *
 * mail 配置支持从 .env 环境变量读取（优先级高于数据库），
 * 适合敏感信息（邮箱密码）不入库的场景：
 *   MAIL_HOST / MAIL_PORT / MAIL_SECURE / MAIL_USER / MAIL_PASS / MAIL_FROM / SITE_URL
 */
export async function reloadSiteConfig(): Promise<any> {
  try {
    const row = await db.query.configs.findFirst({
      where: eq(schema.configs.id, 'site_config'),
    })
    _siteConfig = mergeConfig(DEFAULT_SITE_CONFIG, row?.value || {})
  } catch (e) {
    console.error('[site_config] 加载失败，使用默认配置', e)
    _siteConfig = mergeConfig(DEFAULT_SITE_CONFIG, {})
  }

  // 环境变量覆盖 mail 配置（优先级最高，留空则保持数据库/默认值）
  const env = process.env
  if (env.MAIL_HOST) _siteConfig.mail.host = env.MAIL_HOST
  if (env.MAIL_PORT) _siteConfig.mail.port = Number(env.MAIL_PORT) || _siteConfig.mail.port
  if (env.MAIL_SECURE !== undefined) _siteConfig.mail.secure = env.MAIL_SECURE !== 'false'
  if (env.MAIL_USER) _siteConfig.mail.user = env.MAIL_USER
  if (env.MAIL_PASS) _siteConfig.mail.pass = env.MAIL_PASS
  if (env.MAIL_FROM) _siteConfig.mail.from = env.MAIL_FROM
  if (env.SITE_URL) _siteConfig.mail.siteUrl = env.SITE_URL

  _loaded = true
  return _siteConfig
}
