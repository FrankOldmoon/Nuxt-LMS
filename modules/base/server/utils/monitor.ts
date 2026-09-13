/**
 * 监控页服务端工具：
 * - 解析 PM2 ecosystem 配置文件（CJS），得到各实例的端口与日志路径
 * - 解析实例日志文件实际路径（配置路径 → ~/.pm2/logs → logDir 覆盖）
 * - 读取日志文件末尾 N 行（tail）
 */
import {
  readFileSync,
  existsSync,
  statSync,
  openSync,
  closeSync,
  readSync,
} from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

export interface MonitorInstance {
  name: string
  port: number
  script: string
  cwd: string
  outFile: string
  errorFile: string
}

/** 解析 ecosystem 配置文件路径：override > <cwd>/ecosystem.config.cjs > <cwd>/ecosystem.config.example.cjs */
export function resolveEcosystemConfigPath(override = ''): string {
  if (override && existsSync(override)) return override
  const root = process.cwd()
  for (const f of ['ecosystem.config.cjs', 'ecosystem.config.example.cjs']) {
    const p = join(root, f)
    if (existsSync(p)) return p
  }
  return ''
}

/** 读取并解析 PM2 ecosystem 配置（CommonJS），返回实例列表；解析失败返回空数组 */
export function loadEcosystemConfig(configPath: string): MonitorInstance[] {
  if (!configPath || !existsSync(configPath)) return []
  const content = readFileSync(configPath, 'utf-8')
  const m: { exports: any } = { exports: {} }
  try {
    // ecosystem 配置为纯 JS（仅含字面量与基础运算），在沙箱中求值
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', content)(m, m.exports)
  } catch (e) {
    console.error('[monitor] parse ecosystem config failed:', e)
    return []
  }
  const apps = m.exports?.apps
  if (!Array.isArray(apps)) return []
  return apps.map((app: any) => {
    const port = Number(app.env?.NITRO_PORT || 3000)
    return {
      name: app.name || `nuxt_${port}`,
      port,
      script: app.script || '',
      cwd: app.cwd || '',
      outFile: app.out_file || '',
      errorFile: app.error_file || '',
    }
  })
}

/** 解析实例日志文件路径：配置路径存在则用；否则依次尝试 logDir 覆盖、~/.pm2/logs/{name}-{type}.log */
export function resolveLogFile(app: MonitorInstance, type: 'out' | 'error', logDir = ''): string {
  const configured = type === 'out' ? app.outFile : app.errorFile
  if (configured && existsSync(configured)) return configured
  const candidates: string[] = []
  if (logDir) candidates.push(join(logDir, `${app.name}-${type}.log`))
  candidates.push(join(os.homedir(), '.pm2', 'logs', `${app.name}-${type}.log`))
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return configured || candidates[0] || ''
}

/** 日志文件元信息（路径/是否存在/大小/最后修改时间） */
export function logFileInfo(filePath: string) {
  if (!filePath) return { path: '', exists: false, sizeBytes: 0, modifiedAt: null as string | null }
  if (!existsSync(filePath)) return { path: filePath, exists: false, sizeBytes: 0, modifiedAt: null }
  const stat = statSync(filePath)
  return {
    path: filePath,
    exists: true,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  }
}

/** 读取文件末尾指定行数（grep 过滤时仅返回匹配行） */
export function tailFile(
  filePath: string,
  lines = 100,
  grep = '',
): { exists: boolean; lines: string[]; truncated: boolean } {
  if (!filePath || !existsSync(filePath)) return { exists: false, lines: [], truncated: false }
  const stat = statSync(filePath)
  if (stat.size === 0) return { exists: true, lines: [], truncated: false }

  const chunkSize = Math.min(stat.size, Math.max(256 * 1024, lines * 512))
  const fd = openSync(filePath, 'r')
  let text = ''
  try {
    const buf = Buffer.alloc(chunkSize)
    const bytesRead = readSync(fd, buf, 0, chunkSize, stat.size - chunkSize)
    text = buf.subarray(0, bytesRead).toString('utf-8')
  } finally {
    closeSync(fd)
  }

  // 去掉首行可能被截断的半行
  const nl = text.indexOf('\n')
  if (nl >= 0) text = text.slice(nl + 1)

  let arr = text.split('\n')
  if (grep) arr = arr.filter((l) => l.includes(grep))
  const truncated = arr.length > lines
  return { exists: true, lines: arr.slice(-lines), truncated }
}

/** HTTP 探测某端口是否在线，返回状态与响应耗时 */
export async function checkPort(port: number, timeoutMs = 3000) {
  const start = performance.now()
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/monitor/ping`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Math.round(performance.now() - start),
    }
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - start),
      error: String(e?.cause?.code || e?.message || e),
    }
  }
}

/**
 * 监控查看密码校验（密码为空时放行）。
 * 密码从 Header `x-monitor-pwd` 或 query `pwd` 读取，不匹配则抛 403。
 */
export function assertMonitorPassword(event: any, password: string) {
  if (!password) return
  const provided = getHeader(event, 'x-monitor-pwd') || String(getQuery(event).pwd || '')
  if (provided !== password) {
    throw createError({ statusCode: 403, statusMessage: '监控查看密码错误' })
  }
}
