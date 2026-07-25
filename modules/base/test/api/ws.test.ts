/**
 * Base WebSocket 端点测试
 * @see modules/base/server/api/ws.ts
 *
 * 策略：defineWebSocketHandler 桩透传配置对象（nuxt-stubs 已定义），
 * 直接调用 handler.open/message/close 验证状态与 send 调用。
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'
// base ws.ts 显式 import 真实 ws/state + ws/registry，测试也用真实模块验证状态
import { rooms, userPeers as realUserPeers, joinRoom } from '../../server/utils/ws/state'
import { registerWsServerHandler, registerWsServerCleanup } from '../../server/utils/ws/registry'

beforeEach(() => {
  resetAllStubs()
  realUserPeers.clear()
  rooms.clear()
})

/** 构造一个 mock WebSocket 消息 */
function mockMessage(obj: any) {
  return { text: () => JSON.stringify(obj) } as any
}

/** 从 peer.send mock 中提取已发送的 JSON 消息 */
function sendsOf(peer: any): any[] {
  return peer.send.mock.calls.map((c: any[]) => JSON.parse(c[0]))
}

describe('API: base/ws', () => {
  let handler: any
  beforeEach(async () => {
    handler = (await import('../../server/api/ws')).default
  })

  // ====================== open / close ======================

  it('open 时 trackPeer 注册活跃连接', () => {
    const peer = makeMockPeer()
    handler.open(peer)
    // trackPeer 是 no-op 桩（base ws/state 的 allPeers 是模块私有），
    // 但 open 不应抛错
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('close 时清理用户级连接和房间', () => {
    const peer = makeMockPeer({ userId: 100 })
    // 模拟 registerUser 后的状态
    realUserPeers.set(100, new Set([peer]))
    peer._userId = 100
    // 模拟 join room
    joinRoom('room-1', peer)
    expect(rooms.get('room-1')?.has(peer)).toBe(true)

    handler.close(peer)
    // 用户连接被清理
    expect(realUserPeers.get(100)?.has(peer) ?? false).toBe(false)
    // 房间被清理
    expect(rooms.get('room-1')?.has(peer) ?? false).toBe(false)
  })

  // ====================== registerUser ======================

  it('registerUser 注册到 userPeers 并记录 userId/from', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'registerUser', userId: 100, from: 'alice' }))
    expect(realUserPeers.get(100)?.has(peer)).toBe(true)
    expect(peer._userId).toBe(100)
    expect(peer._userName).toBe('alice')
  })

  it('registerUser 缺 userId 静默忽略', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'registerUser' }))
    expect(realUserPeers.size).toBe(0)
    expect(peer._userId).toBeUndefined()
  })

  it('registerUser userId=0 被忽略', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'registerUser', userId: 0, from: 'x' }))
    expect(realUserPeers.size).toBe(0)
  })

  it('registerUser 多次注册同一用户添加多个 peer', () => {
    const peer1 = makeMockPeer()
    const peer2 = makeMockPeer()
    handler.message(peer1, mockMessage({ type: 'registerUser', userId: 50, from: 'bob' }))
    handler.message(peer2, mockMessage({ type: 'registerUser', userId: 50, from: 'bob' }))
    expect(realUserPeers.get(50)?.size).toBe(2)
  })

  // ====================== join / leave ======================

  it('join 加入房间并回复 joined', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'join', room: 'lobby' }))
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'joined', room: 'lobby' })
    expect(rooms.get('lobby')?.has(peer)).toBe(true)
    expect(peer._rooms?.has('lobby')).toBe(true)
  })

  it('join 缺 room 静默忽略', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'join' }))
    expect(sendsOf(peer)).toHaveLength(0)
    expect(rooms.size).toBe(0)
  })

  it('leave 离开房间', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'join', room: 'r1' }))
    handler.message(peer, mockMessage({ type: 'leave', room: 'r1' }))
    expect(rooms.get('r1')?.has(peer) ?? false).toBe(false)
  })

  it('leave 不存在的房间不报错', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'leave', room: 'nope' }))
    expect(sendsOf(peer)).toHaveLength(0)
  })

  // ====================== 委托 handler ======================

  it('未知 type 委托给 runWsServerHandlers（无注册 handler 时不报错）', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'custom-action', data: 'x' }))
    // 无注册 handler → runWsServerHandlers 返回 false，不抛错
    expect(sendsOf(peer)).toHaveLength(0)
  })

  it('注册的 handler 被调用并接收 peer+data', () => {
    const received: any[] = []
    registerWsServerHandler('my-type', (peer, data) => {
      received.push({ peer, data })
    })
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'my-type', payload: 42 }))
    expect(received).toHaveLength(1)
    expect(received[0].data.payload).toBe(42)
  })

  it('handler 返回 true 时停止后续 handler', () => {
    const calls: string[] = []
    registerWsServerHandler('chain', () => { calls.push('first'); return true })
    registerWsServerHandler('chain', () => { calls.push('second'); return false })
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'chain' }))
    expect(calls).toEqual(['first'])
  })

  it('handler 抛错时被捕获不影响后续 handler', () => {
    const calls: string[] = []
    registerWsServerHandler('err', () => { throw new Error('boom') })
    registerWsServerHandler('err', () => { calls.push('recovered') })
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'err' }))
    expect(calls).toEqual(['recovered'])
  })

  // ====================== close 清理委托 ======================

  it('close 时调用注册的 cleanup 函数', () => {
    const cleanedPeers: any[] = []
    registerWsServerCleanup((peer) => { cleanedPeers.push(peer) })
    const peer = makeMockPeer()
    handler.close(peer)
    expect(cleanedPeers).toContain(peer)
  })

  // ====================== 错误处理 ======================

  it('invalid JSON 推送 error 消息', () => {
    const peer = makeMockPeer()
    handler.message(peer, { text: () => 'not json{' } as any)
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'error', message: 'Invalid message format' })
  })

  it('error 回调不抛错', () => {
    expect(() => handler.error(makeMockPeer(), new Error('test'))).not.toThrow()
  })
})
