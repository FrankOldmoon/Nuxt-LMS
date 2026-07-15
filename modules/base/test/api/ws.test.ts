/**
 * Base WebSocket endpoint tests
 * @see modules/base/server/api/ws.ts
 *
 * Strategy: defineWebSocketHandler stub passes through config object (nuxt-stubs already defined),
 * directly call handler.open/message/close to verify state and send calls.
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'
// base ws.ts explicitly imports real ws/state + ws/registry, tests also use real modules to verify state
import { rooms, userPeers as realUserPeers, joinRoom } from '../../server/utils/ws/state'
import { registerWsServerHandler, registerWsServerCleanup } from '../../server/utils/ws/registry'

beforeEach(() => {
  resetAllStubs()
  realUserPeers.clear()
  rooms.clear()
})

/** Construct a mock WebSocket message */
function mockMessage(obj: any) {
  return { text: () => JSON.stringify(obj) } as any
}

/** Extract sent JSON messages from peer.send mock */
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
    // trackPeer is a no-op stub (base ws/state's allPeers is module-private),
    // but open should not throw
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('close 时清理用户级连接和房间', () => {
    const peer = makeMockPeer({ userId: 100 })
    // Simulate state after registerUser
    realUserPeers.set(100, new Set([peer]))
    peer._userId = 100
    // Simulate join room
    joinRoom('room-1', peer)
    expect(rooms.get('room-1')?.has(peer)).toBe(true)

    handler.close(peer)
    // User connection cleaned up
    expect(realUserPeers.get(100)?.has(peer) ?? false).toBe(false)
    // Room cleaned up
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

  // ====================== Delegate handler ======================

  it('未知 type 委托给 runWsServerHandlers（无注册 handler 时不报错）', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'custom-action', data: 'x' }))
    // No registered handler → runWsServerHandlers returns false, no throw
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

  // ====================== close cleanup delegation ======================

  it('close 时调用注册的 cleanup 函数', () => {
    const cleanedPeers: any[] = []
    registerWsServerCleanup((peer) => { cleanedPeers.push(peer) })
    const peer = makeMockPeer()
    handler.close(peer)
    expect(cleanedPeers).toContain(peer)
  })

  // ====================== Error handling ======================

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
