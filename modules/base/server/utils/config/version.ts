/**
 * 配置版本戳 —— 跨进程配置缓存失效
 *
 * 问题背景：base(site:*) 与 lms(lms:*) 各有一份进程内内存缓存，生产是 nginx + 8 个
 * fork 进程，写入配置时只有「处理该请求的那个进程」会 reload，其余进程仍是旧值，
 * 于是前端读到哪个进程的缓存就是哪个版本的配置。
 *
 * 方案：configs 表里维护一行 sys:configVersion（随机 UUID）作为唯一真相戳。
 * - 任何配置写入后调用 bumpConfigVersion() 生成新戳；
 * - 每个进程在请求入口调用 ensureConfigFresh()，比对上次见到的戳，变化则触发所有
 *   已注册的 reloader 重新读库（见 registerConfigReloader）。
 *
 * 这样无需进程间通信，8 个进程都能在下一次请求时自动对齐到 DB 最新值。
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { runConfigReloaders } from '../hooks'

/** 版本戳存储的 configs 行 id（不落入 site:* / lms:* 前缀，不会被配置读取误采集） */
export const CONFIG_VERSION_KEY = 'sys:configVersion'

/** 生成并写入新版本戳（每次配置写入后调用），返回新戳 */
export async function bumpConfigVersion(): Promise<string> {
  const v = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  await db
    .insert(schema.configs)
    .values({ id: CONFIG_VERSION_KEY, value: v })
    .onConflictDoUpdate({
      target: schema.configs.id,
      set: { value: v },
    })
  return v
}

/** 读取当前版本戳（不存在则 null） */
export async function readConfigVersion(): Promise<string | null> {
  const rows = await db
    .select({ value: schema.configs.value })
    .from(schema.configs)
    .where(eq(schema.configs.id, CONFIG_VERSION_KEY))
    .limit(1)
  const v = rows[0]?.value
  if (v === undefined || v === null) return null
  return typeof v === 'string' ? v : String(v)
}

/** 进程内「上次见到的版本戳」。undefined 表示尚未初始化 */
let _lastVersion: string | null | undefined = undefined
/** 进行中的检查 promise，用于并发请求去重，避免版本变化瞬间集中重载 */
let _inFlight: Promise<void> | null = null

/**
 * 请求级配置新鲜度检查：版本戳变化则重载所有配置缓存。
 *
 * - 幂等：版本未变直接返回（只花一次极小的 SELECT）
 * - 去重：并发请求共享同一次检查，避免"雷群"重载
 * - 安全：读库失败只记日志、不阻断请求，也不清空已有缓存
 */
export async function ensureConfigFresh(): Promise<void> {
  if (_inFlight) return _inFlight
  _inFlight = (async () => {
    let version: string | null
    try {
      version = await readConfigVersion()
    } catch (e) {
      console.error('[config] 版本戳读取失败，跳过本次刷新', e)
      return
    }

    if (_lastVersion !== undefined && version === _lastVersion) return

    // 先记录版本，避免 reloader 内部触发的请求再次进入时重复 reload
    _lastVersion = version
    await runConfigReloaders()
  })()
  try {
    await _inFlight
  } finally {
    _inFlight = null
  }
}

/** 测试用：重置进程内版本记忆 */
export function _resetConfigVersionMemory(): void {
  _lastVersion = undefined
}
