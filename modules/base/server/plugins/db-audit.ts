/**
 * 数据库写操作审计插件（INSERT / UPDATE → logs/<日期>/db-writes.jsonl）
 *
 * 原理：全站数据库读写都经 @nuxthub/db（drizzle-orm/postgres-js 驱动），
 * 所有查询最终都会调用共享模块里的 PostgresJsPreparedQuery.prototype.execute。
 * 启动时给该方法包一层：识别 insert/update 语句，在原方法执行后把
 * 操作者、操作类型、目标表、SQL、参数、耗时、成败异步写入当天审计文件。
 *
 * - 记录 INSERT / UPDATE（含 on conflict do update）与 DELETE（软删走 UPDATE set deleted_at）；
 *   SELECT 不记录；UPDATE/DELETE 缺 where 会标记 noWhere 供异常判定使用
 * - 事务内语句走同一 PreparedQuery 类，天然被覆盖
 * - 操作者：server/middleware/db-audit-context.ts 在每个请求入口用
 *   AsyncLocalStorage.enterWith 把 h3 event 绑定到请求分发上下文（middleware
 *   与路由 handler 在 h3 createAppEventHandler 的同一异步链上逐层 await，
 *   enterWith 对后续所有层可见；不能用 nitro 的 request 钩子——hookable 5.x
 *   的 callHook 经 AsyncResource.runInAsyncScope 隔离上下文，enterWith 传不出去）。
 *   写库时惰性调用 getCurrentUser 解析登录用户并按请求缓存，
 *   未登录 / 启动插件 / 定时任务无请求上下文时记为 null
 * - 补丁只包一层（__dbAuditPatched 标记防重复），不改变任何返回值与异常行为
 * - 执行时机：base 模块通过 nitro:config 钩子把本文件 unshift 到 nitro 插件列表
 *   最前（lms 为覆盖 base API 会把 lms/server 挪到扫描目录首位，见 base/index.ts），
 *   确保补丁先于所有模块的启动写库生效
 */
import { PostgresJsPreparedQuery } from 'drizzle-orm/postgres-js'
import { appendDbAudit, getAuditEvent, parseWriteOp } from '../utils/dbAudit'
import { getCurrentUser } from '../utils/auth/guards'

/** 按请求缓存操作者解析结果（event.context 上挂 promise，避免重复查库） */
function resolveActor(event: any): Promise<{ id: number; username: string; name: string } | null> {
  event.context.__dbAuditActor ??= getCurrentUser(event)
    .then((u: any) => (u ? { id: u.id, username: u.username, name: u.name } : null))
    .catch(() => null)
  return event.context.__dbAuditActor
}

export default defineNitroPlugin(() => {
  const proto = PostgresJsPreparedQuery.prototype as any
  if (proto.__dbAuditPatched) return
  proto.__dbAuditPatched = true

  const origExecute = proto.execute
  proto.execute = async function (this: any, ...args: any[]) {
    const hit = parseWriteOp(this.queryString || '')
    const start = hit ? performance.now() : 0
    try {
      const result = await origExecute.apply(this, args)
      if (hit) {
        // 操作者解析放异步旁路：不阻塞请求返回；解析失败记 null
        void (async () => {
          const event = getAuditEvent()
          appendDbAudit({
            time: new Date().toISOString(),
            op: hit.op,
            noWhere: hit.noWhere,
            table: hit.table,
            ms: Math.round((performance.now() - start) * 100) / 100,
            ok: true,
            sql: this.queryString,
            params: this.params ?? [],
            actor: event ? await resolveActor(event) : null,
          })
        })()
      }
      return result
    } catch (e: any) {
      if (hit) {
        const event = getAuditEvent()
        // 失败路径同步记录（需保留原始抛错行为，故内联解析）
        try {
          const actor = event ? await resolveActor(event) : null
          appendDbAudit({
            time: new Date().toISOString(),
            op: hit.op,
            noWhere: hit.noWhere,
            table: hit.table,
            ms: Math.round((performance.now() - start) * 100) / 100,
            ok: false,
            error: String(e?.message || e),
            sql: this.queryString,
            params: this.params ?? [],
            actor,
          })
        } catch {
          // 静默
        }
      }
      throw e
    }
  }
})
