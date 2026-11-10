/**
 * 数据库写操作审计工具（INSERT / UPDATE）
 *
 * 拦截点见 server/plugins/db-audit.ts：对 drizzle-orm/postgres-js 的
 * PostgresJsPreparedQuery.prototype.execute 打补丁，识别 insert/update 语句，
 * 执行完成后调用本模块把记录落盘。
 *
 * 日志布局：<logs根目录>/<YYYY-MM-DD>/db-writes.jsonl（一天一个子文件夹，JSONL 格式）
 * - 根目录默认 <进程 cwd>/logs（即部署服务器项目根目录下的 logs 文件夹），
 *   可用环境变量 NUXT_DB_AUDIT_DIR 覆盖
 * - 子文件夹名取服务器本地日期；条目内 time 为 UTC ISO 时间戳
 * - params 序列化后超长会截断（记录的是"操作记录"，非完整数据快照）
 * - 写日志全程 try/catch 静默失败，绝不影响业务查询
 */
import { appendFile, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface DbAuditEntry {
  /** UTC ISO 时间戳 */
  time: string
  /** 操作类型 */
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  /** 目标表名 */
  table: string
  /** UPDATE/DELETE 缺少 where 条件（全表影响），高危 */
  noWhere?: boolean
  /** 执行耗时（毫秒） */
  ms: number
  /** 是否执行成功 */
  ok: boolean
  /** 失败时的错误信息 */
  error?: string
  /** SQL 文本（超长截断） */
  sql: string
  /** 绑定参数（JSON 序列化后超长截断） */
  params: unknown[]
  /** 操作者（当前登录用户）；null = 无请求上下文（启动/任务/未登录） */
  actor: { id: number; username: string; name: string } | null
}

/**
 * 请求上下文存储：db-audit 插件在每个请求入口 enterWith 绑定 h3 event，
 * 后续同请求链路内的所有 drizzle 写库都能拿到 event，用于惰性解析操作者。
 * 启动插件 / 定时任务等无请求场景 store 为 undefined。
 */
const auditStorage = new AsyncLocalStorage<{ event: any }>()

/** 在当前异步上下文中绑定请求 event（仅由 db-audit 插件的 request 钩子调用） */
export function bindAuditEvent(event: any): void {
  auditStorage.enterWith({ event })
}

/** 取当前请求的 event；无请求上下文（启动/任务）返回 null */
export function getAuditEvent(): any | null {
  return auditStorage.getStore()?.event ?? null
}

/** SQL / params 的落盘长度上限（字符数），超出截断并标注 */
const SQL_MAX = 4000
const PARAMS_MAX = 8000

// insert 优先于 update 匹配：insert ... on conflict do update 仍按 INSERT 计
const RE_INSERT = /\binsert\s+into\s+"?([a-zA-Z_][\w$]*)"?\b/i
// update 要求后跟 "表名" set，避免命中列名/文本中的 update 一词
const RE_UPDATE = /\bupdate\s+"?([a-zA-Z_][\w$]*)"?\s+set\b/i
// delete from "表名"：硬删除，软删走 UPDATE set deleted_at
const RE_DELETE = /\bdelete\s+from\s+"?([a-zA-Z_][\w$]*)"?\b/i

/** 剥离 SQL 中的字符串字面量（'...' 含 '' 转义、$...$ 美元引用），防止语句文本里的字面量被误判为写操作 */
function stripLiterals(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, '$$')
}

/** 从 SQL 文本识别写操作类型与目标表；非 insert/update/delete 返回 null */
export function parseWriteOp(rawSql: string): { op: 'INSERT' | 'UPDATE' | 'DELETE'; table: string; noWhere: boolean } | null {
  if (!rawSql) return null
  const sql = stripLiterals(rawSql)
  const m = RE_INSERT.exec(sql) || RE_UPDATE.exec(sql) || RE_DELETE.exec(sql)
  if (!m) return null
  const head = m[0].slice(0, 6).toLowerCase()
  const op = head.startsWith('insert') ? 'INSERT' : head.startsWith('update') ? 'UPDATE' : 'DELETE'
  // 没有 where 的 UPDATE / DELETE 会影响整表，单独标记（INSERT 不需要）
  const noWhere = op !== 'INSERT' && !/\bwhere\b/i.test(sql)
  return { op, table: m[1], noWhere }
}

let curDay = ''
let curFile = ''

/** 审计日志根目录：env 覆盖 > 项目根 logs */
function auditRoot(): string {
  return process.env.NUXT_DB_AUDIT_DIR || join(process.cwd(), 'logs')
}

/** 当天日志文件路径；跨天首次写入时自动创建新日期子文件夹 */
function dailyFile(d = new Date()): string {
  // sv-SE locale 的 toLocaleDateString 恰好输出 YYYY-MM-DD（服务器本地时区）
  const day = d.toLocaleDateString('sv-SE')
  if (day !== curDay) {
    const dir = join(auditRoot(), day)
    mkdirSync(dir, { recursive: true })
    curDay = day
    curFile = join(dir, 'db-writes.jsonl')
  }
  return curFile
}

/** 超长字符串截断，标注省略长度 */
function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + `…(+${s.length - max})` : s
}

/** 参数安全序列化（个别复杂对象序列化失败时退化为 String） */
function stringifyParams(params: unknown[]): string {
  try {
    return clip(JSON.stringify(params) ?? '[]', PARAMS_MAX)
  } catch {
    try {
      return clip(String(params), PARAMS_MAX)
    } catch {
      return '[unserializable]'
    }
  }
}

/**
 * 追加一条审计记录（异步落盘）。
 * 故意不 await、不抛错：审计属于旁路逻辑，任何失败都不能影响业务查询。
 */
export function appendDbAudit(entry: DbAuditEntry): void {
  try {
    const line = JSON.stringify({
      ...entry,
      sql: clip(entry.sql, SQL_MAX),
      // params 以字符串形式内联存放，避免超长参数撑爆单行 JSON
      params: stringifyParams(entry.params),
    })
    appendFile(dailyFile(), line + '\n', { encoding: 'utf-8' }, () => {})
  } catch {
    // 静默
  }
}
