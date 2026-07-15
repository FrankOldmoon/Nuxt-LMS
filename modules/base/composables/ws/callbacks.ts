/**
 * WebSocket callback registry and message dispatch (base connection layer)
 *
 * Uses a generic type → handlers mapping, each module registers callbacks via registerWsHandler.
 * The connection module calls dispatch(type, data) to dispatch after receiving messages.
 * Module-level Map ensures all components share the same instance (singleton pattern).
 */
import type { WsHandler } from './types'

const handlers = new Map<string, WsHandler[]>()

/** Register a callback for a message type (returns an unregister function) */
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

/** Dispatch received WS messages to corresponding callbacks */
export function dispatch(type: string, data: any) {
  const arr = handlers.get(type)
  if (arr) arr.forEach(cb => cb(data))
}

/** Clear all callbacks (for testing/disconnect reset) */
export function clearWsHandlers() {
  handlers.clear()
}
