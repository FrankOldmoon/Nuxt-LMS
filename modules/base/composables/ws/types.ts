/**
 * WebSocket 通用回调类型定义（base 连接层）
 *
 * base 仅提供通用的消息分发机制；
 * 各 module（auth/doc/lms）定义自己的消息类型与回调类型，
 * 并通过 registerWsHandler(type, cb) 注册到 base 连接层。
 */

/** 通用 WS 消息处理回调 */
export type WsHandler = (data: any) => void
