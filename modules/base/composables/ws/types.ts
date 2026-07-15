/**
 * WebSocket generic callback type definitions (base connection layer)
 *
 * base only provides the generic message dispatch mechanism;
 * each module (auth/doc/lms) defines its own message types and callback types,
 * and registers them to the base connection layer via registerWsHandler(type, cb).
 */

/** Generic WS message handler callback */
export type WsHandler = (data: any) => void
