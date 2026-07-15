/**
 * Server-side WebSocket message handler / cleanup registry
 *
 * base's ws.ts only handles registerUser, other types are delegated to registered handlers.
 * Subsequent modules (lms) call registerWsServerHandler to register class/race/group business handling.
 */

type WsHandler = (peer: any, data: any) => boolean | void
type WsCleanup = (peer: any) => void

const _handlers = new Map<string, WsHandler[]>()
const _cleanups: WsCleanup[] = []

/** Register a message handler for a type (return true to indicate handled) */
export function registerWsServerHandler(type: string, handler: WsHandler): void {
  const list = _handlers.get(type)
  if (list) list.push(handler)
  else _handlers.set(type, [handler])
}

/** Register cleanup function on connection close */
export function registerWsServerCleanup(fn: WsCleanup): void {
  _cleanups.push(fn)
}

/** Run handlers for the specified type, return whether any handler processed the message */
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

/** Run all cleanup functions */
export function runWsServerCleanups(peer: any): void {
  for (const fn of _cleanups) {
    try {
      fn(peer)
    } catch (e) {
      console.error('[ws] cleanup error', e)
    }
  }
}
