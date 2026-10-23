/**
 * 数据库审计上下文中间件：在每个请求入口把 h3 event 绑定到请求分发上下文。
 *
 * 原理：nitro 的 server middleware 与路由 handler 在 h3 createAppEventHandler
 * 的同一异步链上逐层 await 执行，这里同步调用 AsyncLocalStorage.enterWith
 * 绑定 event 后，本请求后续所有层（handler 及其 await 子链）都能通过
 * getAuditEvent() 取到 event —— db-audit 插件借此在写库时解析操作者。
 *
 * 注意：不能改用 nitro 的 request 钩子做这件事 —— hookable 5.x 的 callHook
 * 经 serialTaskCaller（AsyncResource.runInAsyncScope）调用监听器，enterWith
 * 只作用于被隔离的作用域，传不到后续 handler。
 */
import { bindAuditEvent } from '../utils/dbAudit'

export default defineEventHandler((event) => {
  bindAuditEvent(event)
})
