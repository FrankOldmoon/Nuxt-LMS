/**
 * LMS WS Group message handler unit test
 * @see modules/lms/server/utils/ws/group.ts
 *
 * Coverage:
 * - handleGroupMessage: dispatcher (type routing + unknown type returns false)
 * - joinGroup: join group + joinedGroup push
 * - groupChat: broadcast chat messages (truncate 1000 chars + skip empty text)
 * - leaveGroup: leave group
 * - cleanupGroupPeer: close connection and clean up all group rooms
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { groupRooms } from '../../server/utils/ws/state'
import { handleGroupMessage, cleanupGroupPeer } from '../../server/utils/ws/group'

beforeEach(() => {
  groupRooms.clear()
})

function sendsOf(peer: any): any[] {
  return peer.send.mock.calls.map((c: any[]) => JSON.parse(c[0]))
}

describe('ws/group: handleGroupMessage dispatcher', () => {
  it('未知 type 返回 false', () => {
    expect(handleGroupMessage(makeMockPeer(), { type: 'unknown' })).toBe(false)
  })

  it('joinGroup 缺 groupId 仍返回 true（不处理但不报错）', () => {
    expect(handleGroupMessage(makeMockPeer(), { type: 'joinGroup' })).toBe(true)
  })

  it('groupChat 缺 groupId 仍返回 true（不处理但不报错）', () => {
    expect(handleGroupMessage(makeMockPeer(), { type: 'groupChat' })).toBe(true)
  })

  it('leaveGroup 缺 groupId 仍返回 true', () => {
    expect(handleGroupMessage(makeMockPeer(), { type: 'leaveGroup' })).toBe(true)
  })
})

describe('ws/group: joinGroup', () => {
  it('加入小组后 peer 收到 joinedGroup 推送', () => {
    const peer = makeMockPeer({ userId: 1, userName: 'a' })
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1', userId: 1, from: 'a' })
    expect(groupRooms.get('g1')?.has(peer)).toBe(true)
    expect(peer._userId).toBe(1)
    expect(peer._userName).toBe('a')
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'joinedGroup', groupId: 'g1' })
  })

  it('joinGroup 不带 userId/from 不会覆盖已有字段', () => {
    const peer = makeMockPeer({ userId: 99, userName: 'preset' })
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    // makeMockPeer defaults userId=undefined/userName='test-user', preset here is not overwritten
    expect(peer._userId).toBe(99)
    expect(peer._userName).toBe('preset')
  })

  it('joinGroup 支持同时加入多个小组', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g2' })
    expect(groupRooms.get('g1')?.has(peer)).toBe(true)
    expect(groupRooms.get('g2')?.has(peer)).toBe(true)
    expect(peer._groupIds?.has('g1')).toBe(true)
    expect(peer._groupIds?.has('g2')).toBe(true)
  })
})

describe('ws/group: groupChat', () => {
  it('聊天消息广播给小组内所有成员', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'a' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'b' })
    handleGroupMessage(peer1, { type: 'joinGroup', groupId: 'g1', userId: 1, from: 'a' })
    handleGroupMessage(peer2, { type: 'joinGroup', groupId: 'g1', userId: 2, from: 'b' })
    peer1.send.mockClear()
    peer2.send.mockClear()
    handleGroupMessage(makeMockPeer(), {
      type: 'groupChat', groupId: 'g1', userId: 1, from: 'a', text: 'hello',
    })
    const sends1 = sendsOf(peer1)
    const sends2 = sendsOf(peer2)
    expect(sends1).toContainEqual(expect.objectContaining({
      type: 'groupChat', groupId: 'g1', userId: 1, from: 'a', text: 'hello',
    }))
    expect(sends2).toContainEqual(expect.objectContaining({
      type: 'groupChat', groupId: 'g1', userId: 1, from: 'a', text: 'hello',
    }))
  })

  it('groupChat 文本超过 1000 字符被截断', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1', userId: 1, from: 'a' })
    peer.send.mockClear()
    const longText = 'x'.repeat(1500)
    handleGroupMessage(makeMockPeer(), {
      type: 'groupChat', groupId: 'g1', userId: 1, from: 'a', text: longText,
    })
    const chat = sendsOf(peer).find((m: any) => m.type === 'groupChat')
    expect(chat.text.length).toBe(1000)
  })

  it('groupChat 空文本被跳过', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    peer.send.mockClear()
    handleGroupMessage(makeMockPeer(), { type: 'groupChat', groupId: 'g1', text: '' })
    expect(peer.send).not.toHaveBeenCalled()
  })

  it('groupChat 不存在的小组静默忽略', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    peer.send.mockClear()
    expect(() => handleGroupMessage(makeMockPeer(), {
      type: 'groupChat', groupId: 'missing', text: 'hi',
    })).not.toThrow()
    expect(peer.send).not.toHaveBeenCalled()
  })
})

describe('ws/group: leaveGroup', () => {
  it('离开小组后从 room 移除', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    expect(groupRooms.get('g1')?.has(peer)).toBe(true)
    handleGroupMessage(peer, { type: 'leaveGroup', groupId: 'g1' })
    expect(groupRooms.get('g1')?.has(peer)).toBeFalsy()
    expect(peer._groupIds?.has('g1')).toBe(false)
  })

  it('leaveGroup 不会影响其他小组', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g2' })
    handleGroupMessage(peer, { type: 'leaveGroup', groupId: 'g1' })
    expect(groupRooms.get('g1')?.has(peer)).toBeFalsy()
    expect(groupRooms.get('g2')?.has(peer)).toBe(true)
  })
})

describe('ws/group: cleanupGroupPeer', () => {
  it('离开时清理所有已加入的小组', () => {
    const peer = makeMockPeer()
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g1' })
    handleGroupMessage(peer, { type: 'joinGroup', groupId: 'g2' })
    cleanupGroupPeer(peer)
    expect(groupRooms.get('g1')?.has(peer)).toBeFalsy()
    expect(groupRooms.get('g2')?.has(peer)).toBeFalsy()
    expect(peer._groupIds?.size).toBe(0)
  })

  it('未加入任何小组时静默返回', () => {
    const peer = makeMockPeer()
    expect(() => cleanupGroupPeer(peer)).not.toThrow()
  })
})
