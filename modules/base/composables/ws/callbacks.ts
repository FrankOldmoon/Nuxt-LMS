/**
 * WebSocket 回调注册表与消息分发（base 连接层）
 *
 * 采用通用的 type → handlers 映射，各 module 通过 registerWsHandler 注册回调。
 * connection 模块收到消息后调用 dispatch(type, data) 分发。
 * 模块级 Map 确保所有组件共享同一份（单例模式）。
 */
import type { WsHandler } from './types'

const handlers = new Map<string, WsHandler[]>()

/** 注册某消息类型的回调（返回取消注册函数） */
export function registerWsHandler(type: string, cb: WsHandler): () => void {
  let arr = handlers.get(type)
  if (!arr) {
    arr = []
    handlers.set(type, arr)
  }
  arr.push(cb)
  return () => {
    const a = handlers.get(type)
    if (a) {
      const i = a.indexOf(cb)
      if (i >= 0) a.splice(i, 1)
    }
  }
}

/** 将收到的 WS 消息分发到对应回调 */
export function dispatch(type: string, data: any) {
  const arr = handlers.get(type)
  if (arr) arr.forEach(cb => cb(data))
}

/** 清空所有回调（测试/断线重置用） */
export function clearWsHandlers() {
  handlers.clear()
}
