/**
 * OJ 平台基址 —— 脚本统一读取入口
 *
 * 唯一来源：LMS 系统设置 → 学习行为配置 →「OJ 基础地址」（数据库 configs 表的 lms:oj.url）。
 * 与本项目服务端 modules/lms/server/utils/questions/oj.ts 的 getOjUrl() 同源，
 * 脚本里不允许再写死任何 OJ 地址。
 *
 * 两种读法（按脚本有没有自己的目标站点选）：
 *   await getOjBase()                        读根目录 .env 的 POSTGRES_URL 所指向实例的 configs 表
 *   await getOjBase({ site: 'https://x.y' })  读该站点的公开配置 GET <site>/api/config/lms-public
 *
 * 未配置（空串）时直接抛错并提示去系统设置里填，不做"静默回退到某个默认地址"。
 */
const fs = require('node:fs')
const path = require('node:path')

const CONFIG_KEY = 'lms:oj.url'

/** 解析 POSTGRES_URL：优先进程环境变量，其次 .env（先当前目录、再项目根目录） */
function loadPostgresUrl() {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ]
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue
    const line = fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('POSTGRES_URL='))
    if (line) return line.slice('POSTGRES_URL='.length).trim().replace(/^["']|["']$/g, '')
  }
  throw new Error('[oj-config] 未找到 POSTGRES_URL：请设置环境变量或在项目根目录 .env 中配置')
}

function normalize(url, source) {
  const s = String(url == null ? '' : url).trim().replace(/\/+$/, '')
  if (!s) {
    throw new Error(
      `[oj-config] ${source} 里的 OJ 基础地址为空。` +
      '请到 管理后台 → 系统设置 → 学习行为配置 → OJ 基础地址 填写后再运行。',
    )
  }
  return s
}

/**
 * 取 OJ 平台基址（已去掉末尾斜杠）
 * @param {{ site?: string }} [opts] site 为空则读数据库 configs 表；否则读该站点的公开配置
 */
async function getOjBase(opts = {}) {
  const site = opts.site ? String(opts.site).replace(/\/+$/, '') : ''
  if (site) {
    const res = await fetch(`${site}/api/config/lms-public`)
    if (!res.ok) throw new Error(`[oj-config] 读取 ${site} 公开配置失败：HTTP ${res.status}`)
    const body = await res.json().catch(() => null)
    return normalize(body && body.data && body.data.oj && body.data.oj.url, `${site} 的系统设置`)
  }
  const postgres = require('postgres')
  const sql = postgres(loadPostgresUrl(), { max: 1 })
  try {
    const rows = await sql`select value from configs where id = ${CONFIG_KEY} limit 1`
    return normalize(rows[0] && rows[0].value, '数据库 configs 表 lms:oj.url')
  } finally {
    await sql.end()
  }
}

module.exports = { getOjBase }
