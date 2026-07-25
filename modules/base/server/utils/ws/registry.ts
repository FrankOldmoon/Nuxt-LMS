/**
 * 服务端 WebSocket 消息处理 / 清理注册表
 *
 * base 的 ws.ts 只处理 registerUser，其余 type 交给注册的 handler。
 * 后续模块（lms）调用 registerWsServerHandler 注册 class/race/group 等业务处理。
 */

type WsHandler = (peer: any, data: any) => boolean | void
type WsCleanup = (peer: any) => void

const _handlers = new Map<string, WsHandler[]>()
const _cleanups: WsCleanup[] = []

/** 注册某 type 的消息处理器（返回 true 表示已处理） */
export function registerWsServerHandler(type: string, handler: WsHandler): void {
  const list = _handlers.get(type)
  if (list) list.push(handler)
  else _handlers.set(type, [handler])
}

/** 注册连接关闭时的清理函数 */
export function registerWsServerCleanup(fn: WsCleanup): void {
  _cleanups.push(fn)
}

/** 运行指定 type 的处理器，返回是否有 handler 处理了消息 */
export function runWsServerHandlers(peer: any, data: any): boolean {
  const type = data?.type
  if (!type) return false
  const list = _handlers.get(type)
  if (!list || !list.length) return false
  for (const fn of list) {
    try {
      if (fn(peer, data) === true) return true
    } catch (e) {
      console.error('[ws] handler error', e)
    }
  }
  return false
}

/** 运行所有清理函数 */
export function runWsServerCleanups(peer: any): void {
  for (const fn of _cleanups) {
    try {
      fn(peer)
    } catch (e) {
      console.error('[ws] cleanup error', e)
    }
  }
}
