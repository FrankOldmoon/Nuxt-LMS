/**
 * LMS WS 端点测试（ws.ts / ws_lock.ts）
 * @see modules/lms/server/api/ws.ts
 * @see modules/lms/server/api/ws_lock.ts
 *
 * 策略：通过 nuxt-stubs.ts 已定义 defineWebSocketHandler 桩（透传配置对象），
 * 直接调用 message(peer, mockMessage) 验证 send 调用。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// race-handlers/answer 引入 @nuxthub/db（服务端判分），需 mock
vi.mock('@nuxthub/db', () => ({
  db: { query: { questions: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) } } },
  schema: { questions: { courseId: 'courseId', cid: 'cid' } },
}))

import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { classRooms, raceRooms, groupRooms, raceStates, votes, quickAnswers } from '../../server/utils/ws/state'
import { lockRooms, lockHolders } from '../../server/api/ws_lock'
import { resetAllStubs, userPeers } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  classRooms.clear()
  raceRooms.clear()
  groupRooms.clear()
  raceStates.clear()
  votes.clear()
  quickAnswers.clear()
  userPeers.clear()
  lockRooms.clear()
  lockHolders.clear()
})

/** 构造一个 mock WebSocket 消息 */
function mockMessage(obj: any) {
  return { text: () => JSON.stringify(obj) } as any
}

function sendsOf(peer: any): any[] {
  return peer.send.mock.calls.map((c: any[]) => JSON.parse(c[0]))
}

describe('API: lms/ws', () => {
  let handler: any
  beforeEach(async () => {
    handler = (await import('../../server/api/ws')).default
  })

  it('registerUser 注册到 userPeers', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'registerUser', userId: 100, from: 'alice' }))
    expect(userPeers.get(100)?.has(peer)).toBe(true)
    expect(peer._userId).toBe(100)
    expect(peer._userName).toBe('alice')
  })

  it('registerUser 缺 userId 静默忽略', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'registerUser' }))
    expect(userPeers.size).toBe(0)
  })

  it('join 转发到 class handler', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'join', classId: 1, userId: 100, from: 'alice' }))
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'joined', classId: 1 })
    expect(classRooms.get(1)?.has(peer)).toBe(true)
  })

  it('invalid JSON 推送 error', () => {
    const peer = makeMockPeer()
    handler.message(peer, { text: () => 'invalid json{' } as any)
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'error', message: 'Invalid message format' })
  })

  it('close 清理 userPeers + classRooms', () => {
    const peer = makeMockPeer({ userId: 5, userName: 'alice' })
    handler.message(peer, mockMessage({ type: 'registerUser', userId: 5, from: 'alice' }))
    handler.message(peer, mockMessage({ type: 'join', classId: 1, userId: 5, from: 'alice' }))
    expect(userPeers.has(5)).toBe(true)
    expect(classRooms.get(1)?.has(peer)).toBe(true)
    handler.close(peer)
    expect(userPeers.has(5)).toBe(false)
    expect(classRooms.get(1)?.has(peer)).toBeFalsy()
  })

  it('close 最后一个 userId peer 断开时清理 userPeers entry', () => {
    const peer = makeMockPeer({ userId: 10, userName: 'a' })
    handler.message(peer, mockMessage({ type: 'registerUser', userId: 10, from: 'a' }))
    expect(userPeers.get(10)?.size).toBe(1)
    handler.close(peer)
    expect(userPeers.has(10)).toBe(false)
  })

  it('close 未登录 peer 静默忽略 userPeers 清理', () => {
    const peer = makeMockPeer()
    expect(() => handler.close(peer)).not.toThrow()
  })

  it('open 钩子无副作用', () => {
    const peer = makeMockPeer()
    expect(() => handler.open(peer)).not.toThrow()
  })
})

describe('API: lms/ws_lock', () => {
  let handler: any
  beforeEach(async () => {
    handler = (await import('../../server/api/ws_lock')).default
  })

  it('lockJoin 首人获得锁', () => {
    const peer = makeMockPeer({ userId: 1, userName: 'alice' })
    handler.message(peer, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 1, userName: 'alice' }))
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'lockAcquired', lockId: 'l1' })
    expect(peer._lockId).toBe('l1')
  })

  it('lockJoin 缺 lockId 静默忽略', () => {
    const peer = makeMockPeer()
    handler.message(peer, mockMessage({ type: 'lockJoin', userId: 1, userName: 'a' }))
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('lockJoin 后入者被拒（首人还在线）', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'alice', readyState: 1 })
    const peer2 = makeMockPeer({ userId: 2, userName: 'bob', readyState: 1 })
    handler.message(peer1, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 1, userName: 'alice' }))
    peer1.send.mockClear()
    handler.message(peer2, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 2, userName: 'bob' }))
    const sends2 = sendsOf(peer2)
    expect(sends2).toContainEqual({ type: 'lockDenied', lockId: 'l1', lockedBy: 'alice' })
  })

  it('lockRelease 释放后自动转移给房间中下一人', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'alice', readyState: 1 })
    const peer2 = makeMockPeer({ userId: 2, userName: 'bob', readyState: 1 })
    const peer3 = makeMockPeer({ userId: 3, userName: 'carol', readyState: 1 })
    // peer1 获取锁
    handler.message(peer1, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 1, userName: 'alice' }))
    // peer2/peer3 加入房间
    handler.message(peer2, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 2, userName: 'bob' }))
    handler.message(peer3, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 3, userName: 'carol' }))
    // peer1 释放
    peer2.send.mockClear()
    peer3.send.mockClear()
    handler.message(peer1, mockMessage({ type: 'lockRelease' }))
    // peer2 应获得锁
    const sends2 = sendsOf(peer2)
    expect(sends2).toContainEqual({ type: 'lockAcquired', lockId: 'l1' })
    // peer3 应被告知
    const sends3 = sendsOf(peer3)
    expect(sends3).toContainEqual({ type: 'lockDenied', lockId: 'l1', lockedBy: 'bob' })
  })

  it('lockRelease 无 lockId 静默忽略', () => {
    const peer = makeMockPeer()
    expect(() => handler.message(peer, mockMessage({ type: 'lockRelease' }))).not.toThrow()
  })

  it('lockRelease 释放者不是当前 holder 静默忽略', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'alice', readyState: 1 })
    const peer2 = makeMockPeer({ userId: 2, userName: 'bob', readyState: 1 })
    handler.message(peer1, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 1, userName: 'alice' }))
    // peer2 没获取锁，尝试 release
    expect(() => handler.message(peer2, mockMessage({ type: 'lockRelease' }))).not.toThrow()
  })

  it('close 清理 lock 状态', () => {
    const peer = makeMockPeer({ userId: 1, userName: 'alice', readyState: 1 })
    handler.message(peer, mockMessage({ type: 'lockJoin', lockId: 'l1', userId: 1, userName: 'alice' }))
    handler.close(peer)
    // peer._lockId 已被清理
    expect(peer._lockId).toBeUndefined()
  })

  it('error 钩子无副作用', () => {
    expect(() => handler.error(makeMockPeer(), new Error('x'))).not.toThrow()
  })

  it('invalid JSON 推送 error', () => {
    const peer = makeMockPeer()
    handler.message(peer, { text: () => 'invalid{' } as any)
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'error', message: 'Invalid message format' })
  })
})
