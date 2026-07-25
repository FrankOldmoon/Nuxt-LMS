/**
 * composables/ws/connection 测试
 * @see modules/base/composables/ws/connection.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

// getAuthUserSync 是 useAuth.ts 的 auto-import，未在 nuxt-stubs 中暴露，需手动 stub
function stubGetAuthUserSync(user: any = null) {
  ;(globalThis as any).getAuthUserSync = () => user
}

/**
 * 创建可被 `new` 调用的 WebSocket mock 构造函数。
 * vi.fn(() => obj) 的实现是箭头函数，不能被 `new` 调用；
 * 改用普通 function 构造器，返回对象覆盖 `this`。
 * 返回的构造函数本身附带 .mock 属性（与 vi.fn 兼容的 calls 数组）。
 */
function mockWebSocket(opts: {
  readyState?: number
  send?: ReturnType<typeof vi.fn>
  close?: ReturnType<typeof vi.fn>
} = {}) {
  const ctorSpy = vi.fn()
  const sendSpy = opts.send ?? vi.fn()
  const closeSpy = opts.close ?? vi.fn()
  function WsCtor(this: any, url: string) {
    ctorSpy(url)
    return {
      url,
      readyState: opts.readyState ?? 1,
      send: sendSpy,
      close: closeSpy,
      onopen: null as any,
      onmessage: null as any,
      onclose: null as any,
      onerror: null as any,
    }
  }
  ;(WsCtor as any).OPEN = 1
  ;(WsCtor as any).CONNECTING = 0
  ;(WsCtor as any).CLOSING = 2
  ;(WsCtor as any).CLOSED = 3
  ;(WsCtor as any).mock = ctorSpy.mock
  return Object.assign(WsCtor, { sendSpy, closeSpy, ctorSpy }) as any
}

beforeEach(async () => {
  resetAllStubs()
  stubGetAuthUserSync(null)
  // 清理模块级 joinedRooms / reconnectTimer（通过 disconnect）
  const { useWsConnection } = await import('../../composables/ws/connection')
  try { useWsConnection().disconnect() } catch { /* noop */ }
})

describe('composables/ws/connection - send', () => {
  it('未连接时 send 是 no-op（不抛错）', async () => {
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { send } = useWsConnection()
    expect(() => send({ type: 'test' })).not.toThrow()
  })

  it('连接后 send 调用 ws.send 并 JSON 序列化', async () => {
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, send } = useWsConnection()
    connect()
    // 触发 onopen 设置 wsConnected
    ;(ws.value as any).onopen()
    send({ type: 'ping' })
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
  })

  it('readyState 不是 OPEN 时不发送', async () => {
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 0, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, send } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    send({ type: 'ping' })
    expect(sendSpy).not.toHaveBeenCalled()
  })
})

describe('composables/ws/connection - joinRoom / leaveRoom', () => {
  it('joinRoom 加入房间并发送 join 消息', async () => {
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, joinRoom } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    joinRoom('room-1')
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'join', room: 'room-1' }))
  })

  it('leaveRoom 移除房间并发送 leave 消息', async () => {
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, joinRoom, leaveRoom } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    joinRoom('room-1')
    leaveRoom('room-1')
    expect(sendSpy).toHaveBeenLastCalledWith(JSON.stringify({ type: 'leave', room: 'room-1' }))
  })

  it('连接 open 时自动重新加入已加入的房间', async () => {
    stubGetAuthUserSync({ id: 7, name: 'alice' })
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, joinRoom } = useWsConnection()
    // 第一次连接前加入房间（此时 ws 为 null，send no-op，但 joinedRooms 已记录）
    joinRoom('room-x')
    connect()
    ;(ws.value as any).onopen()
    // 应该发送了 registerUser + join room-x
    const calls = sendSpy.mock.calls.map(c => c[0])
    expect(calls.some(s => s.includes('"registerUser"') && s.includes('"userId":7'))).toBe(true)
    expect(calls.some(s => s.includes('"join"') && s.includes('"room-x"'))).toBe(true)
  })

  it('已登录用户连接时发送 registerUser', async () => {
    stubGetAuthUserSync({ id: 5, name: 'bob' })
    const sendSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, send: sendSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'registerUser', userId: 5, from: 'bob' }))
  })
})

describe('composables/ws/connection - connect / disconnect', () => {
  it('connect 创建 WebSocket 实例并设置 ws', async () => {
    const WsCtor = mockWebSocket({ readyState: 0 })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, wsConnected } = useWsConnection()
    expect(ws.value).toBeNull()
    connect()
    expect(ws.value).not.toBeNull()
    expect(wsConnected.value).toBe(false)
    // 触发 onopen
    ;(ws.value as any).onopen()
    expect(wsConnected.value).toBe(true)
  })

  it('已连接时 connect 不重复创建', async () => {
    const WsCtor = mockWebSocket({ readyState: 1 })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    connect()
    expect(WsCtor.mock.calls).toHaveLength(1)
  })

  it('disconnect 关闭 ws 并清空状态', async () => {
    const closeSpy = vi.fn()
    const WsCtor = mockWebSocket({ readyState: 1, close: closeSpy })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect, disconnect, wsConnected, joinRoom } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    joinRoom('r1')
    disconnect()
    expect(closeSpy).toHaveBeenCalled()
    expect(ws.value).toBeNull()
    expect(wsConnected.value).toBe(false)
  })

  it('onmessage 解析 JSON 并 dispatch 到对应 type', async () => {
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const received: any[] = []
    // registerWsHandler 来自 callbacks 模块（直接导入真实实现）
    const { registerWsHandler } = await import('../../composables/ws/callbacks')
    registerWsHandler('notify', (d) => { received.push(d) })

    const WsCtor = mockWebSocket({ readyState: 1 })
    ;(globalThis as any).WebSocket = WsCtor
    const conn = useWsConnection()
    conn.connect()
    ;(conn.ws.value as any).onopen()
    ;(conn.ws.value as any).onmessage({ data: JSON.stringify({ type: 'notify', id: 9 }) })
    expect(received).toEqual([{ type: 'notify', id: 9 }])
  })

  it('onmessage 收到非法 JSON 不抛错', async () => {
    const WsCtor = mockWebSocket({ readyState: 1 })
    ;(globalThis as any).WebSocket = WsCtor
    const { useWsConnection } = await import('../../composables/ws/connection')
    const { ws, connect } = useWsConnection()
    connect()
    ;(ws.value as any).onopen()
    expect(() => {
      ;(ws.value as any).onmessage({ data: 'not json{' })
    }).not.toThrow()
  })
})
