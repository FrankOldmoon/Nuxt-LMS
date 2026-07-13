/**
 * LMS WS 班级消息处理器单元测试
 * @see modules/lms/server/utils/ws/class.ts
 * @see modules/lms/server/utils/ws/class-handlers/*.ts
 *
 * 覆盖：
 * - handleClassMessage  dispatcher（type 路由 + 未知 type 返回 false）
 * - handleClassJoin  加入班级 + joined 推送 + onlineUpdate 广播
 * - handleClassInvite  邀请广播
 * - handleClassDanmaku  弹幕（截断 200 字符）
 * - handleClassOnline  在线状态
 * - handleClassChatroom  聊天室（截断 1000 字符 + 空文本跳过）
 * - voteStart / voteSubmit / voteEnd  投票状态机（计票 + 重复投票防刷 + 清理）
 * - quickAnswerStart / Submit / End  抢答（首人胜出 + 防重复）
 * - cleanupClassPeer  离开清理
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { makeMockPeer } from '../../../../test/setup/db-helpers'
import { classRooms, votes, quickAnswers } from '../../server/utils/ws/state'
import { handleClassMessage, cleanupClassPeer } from '../../server/utils/ws/class'

beforeEach(() => {
  classRooms.clear()
  votes.clear()
  quickAnswers.clear()
})

/** 收集所有 peer.send 调用并解析 JSON */
function sendsOf(peer: any): any[] {
  return peer.send.mock.calls.map((c: any[]) => JSON.parse(c[0]))
}

describe('ws/class: handleClassMessage dispatcher', () => {
  it('未知 type 返回 false', () => {
    const peer = makeMockPeer()
    const result = handleClassMessage(peer, { type: 'unknown', classId: 1 })
    expect(result).toBe(false)
  })

  it('非 join 消息但缺少 classId 返回 false', () => {
    const peer = makeMockPeer()
    const result = handleClassMessage(peer, { type: 'danmaku' })
    expect(result).toBe(false)
  })

  it('join 消息即使没有 classId 也由 handler 内部处理（返回 true）', () => {
    const peer = makeMockPeer()
    const result = handleClassMessage(peer, { type: 'join' })
    // handleClassJoin 内部对无 classId 静默忽略，但 dispatcher 返回 true
    expect(result).toBe(true)
  })
})

describe('ws/class: join', () => {
  it('加入班级后 peer._classId 被设置 + 收到 joined 推送', () => {
    const peer = makeMockPeer()
    handleClassMessage(peer, { type: 'join', classId: 1, userId: 100, from: 'alice' })
    expect(peer._classId).toBe(1)
    expect(peer._userId).toBe(100)
    expect(peer._userName).toBe('alice')
    expect(classRooms.get(1)?.has(peer)).toBe(true)
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'joined', classId: 1 })
  })

  it('join 时携带 userId 广播 onlineUpdate', () => {
    const peer1 = makeMockPeer({ userId: 1, userName: 'alice' })
    const peer2 = makeMockPeer({ userId: 2, userName: 'bob' })
    // peer1 先加入（已收到 onlineUpdate 推送但广播房间为空）
    handleClassMessage(peer1, { type: 'join', classId: 1, userId: 1, from: 'alice' })
    // peer2 加入时会触发 onlineUpdate 广播给 peer1
    handleClassMessage(peer2, { type: 'join', classId: 1, userId: 2, from: 'bob' })
    const p1Sends = sendsOf(peer1)
    expect(p1Sends).toContainEqual({
      type: 'onlineUpdate', classId: 1, userId: 2, from: 'bob', online: true,
    })
  })

  it('缺少 classId 静默忽略（不抛错、不加入房间）', () => {
    const peer = makeMockPeer()
    expect(() => handleClassMessage(peer, { type: 'join' })).not.toThrow()
    expect(peer._classId).toBeUndefined()
    expect(peer.send).not.toHaveBeenCalled()
  })

  // 回归测试：base 层 useWsConnection().joinRoom() 实际发送的字段叫 `room`，
  // 修复前 handleClassJoin 只读 data.classId，导致 join 静默失败、
  // classRooms 始终为空，所有班级广播（danmaku/online/chatroom/vote/...）落空。
  it('【回归】join 接受 base 层的 room 字段（兼容 useWsConnection().joinRoom 协议）', () => {
    const peer = makeMockPeer()
    handleClassMessage(peer, { type: 'join', room: 7, userId: 100, from: 'alice' })
    expect(peer._classId).toBe(7)
    expect(peer._userId).toBe(100)
    expect(peer._userName).toBe('alice')
    expect(classRooms.get(7)?.has(peer)).toBe(true)
    const sends = sendsOf(peer)
    expect(sends).toContainEqual({ type: 'joined', classId: 7 })
  })

  it('【回归】room 为字符串时也正确转换为数字 classId', () => {
    const peer = makeMockPeer()
    handleClassMessage(peer, { type: 'join', room: '42' })
    expect(peer._classId).toBe(42)
    expect(classRooms.get(42)?.has(peer)).toBe(true)
  })

  it('【回归】room 与 classId 同时存在时优先使用 room', () => {
    const peer = makeMockPeer()
    handleClassMessage(peer, { type: 'join', room: 5, classId: 999 })
    expect(peer._classId).toBe(5)
    expect(classRooms.get(5)?.has(peer)).toBe(true)
    expect(classRooms.has(999)).toBe(false)
  })

  it('【回归】join 成功后，danmaku 广播能到达该 peer', () => {
    const peer = makeMockPeer()
    // 模拟 base 层 joinRoom 协议
    handleClassMessage(peer, { type: 'join', room: 10, userId: 1, from: 'alice' })
    peer.send.mockClear()
    // 模拟 lms 层 sendDanmaku 协议
    handleClassMessage(makeMockPeer(), {
      type: 'danmaku', classId: 10, text: 'hello', from: 'bob',
    })
    const danmaku = sendsOf(peer).find((m: any) => m.type === 'danmaku')
    expect(danmaku).toEqual({ type: 'danmaku', text: 'hello', from: 'bob' })
  })
})

describe('ws/class: invite / danmaku / online / chatroom', () => {
  let listener: any
  beforeEach(() => {
    // 预填充房间：listener 始终在房间里，可用于接收广播
    listener = makeMockPeer({ userId: 1, userName: 'a' })
    handleClassMessage(listener, { type: 'join', classId: 10, userId: 1, from: 'a' })
    listener.send.mockClear() // 清掉 joined 推送
  })

  it('invite 广播给所有班级成员', () => {
    handleClassMessage(makeMockPeer(), { type: 'invite', classId: 10, courseId: 5, chapterId: 7, from: 'teacher' })
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({
      type: 'invite', courseId: 5, chapterId: 7, from: 'teacher',
    })
  })

  it('danmaku 文本超过 200 字符被截断', () => {
    const longText = 'x'.repeat(300)
    handleClassMessage(makeMockPeer(), { type: 'danmaku', classId: 10, text: longText, from: 'user' })
    const danmaku = sendsOf(listener).find((m: any) => m.type === 'danmaku')
    expect(danmaku.text.length).toBe(200)
  })

  it('danmaku 文本非 string 会被强转', () => {
    handleClassMessage(makeMockPeer(), { type: 'danmaku', classId: 10, text: 12345, from: 'u' })
    const danmaku = sendsOf(listener).find((m: any) => m.type === 'danmaku')
    expect(danmaku.text).toBe('12345')
  })

  it('online 状态广播', () => {
    handleClassMessage(makeMockPeer(), { type: 'online', classId: 10, userId: 5, from: 'u5', online: false })
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({
      type: 'onlineUpdate', classId: 10, userId: 5, from: 'u5', online: false,
    })
  })

  it('chatroom 文本超过 1000 字符被截断', () => {
    const longText = 'y'.repeat(1500)
    handleClassMessage(makeMockPeer(), { type: 'chatroom', classId: 10, userId: 5, from: 'u5', text: longText })
    const cr = sendsOf(listener).find((m: any) => m.type === 'chatroom')
    expect(cr.text.length).toBe(1000)
  })

  it('chatroom 空文本被跳过', () => {
    handleClassMessage(makeMockPeer(), { type: 'chatroom', classId: 10, userId: 5, from: 'u5', text: '' })
    const cr = sendsOf(listener).find((m: any) => m.type === 'chatroom')
    expect(cr).toBeUndefined()
  })
})

describe('ws/class: vote 状态机', () => {
  let listener: any
  beforeEach(() => {
    listener = makeMockPeer({ userId: 1, userName: 'a' })
    handleClassMessage(listener, { type: 'join', classId: 1, userId: 1, from: 'a' })
    listener.send.mockClear()
  })

  it('voteStart 创建投票 + 广播 voteStart', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v1', question: 'Q?', options: ['A', 'B', 'C'],
    })
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({
      type: 'voteStart', voteId: 'v1', question: 'Q?', options: ['A', 'B', 'C'],
    })
    expect(votes.has('v1')).toBe(true)
  })

  it('voteStart options 超过 10 截断', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v2', question: 'Q?', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    })
    expect(votes.get('v2')!.options).toHaveLength(10)
  })

  it('voteStart options 非数组默认 [A, B]', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v3', question: 'Q?',
    })
    expect(votes.get('v3')!.options).toEqual(['A', 'B'])
  })

  it('voteSubmit 计票 + voteUpdate 广播', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v4', question: 'Q?', options: ['A', 'B'],
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'v4', optionIndex: 0, from: 'alice',
    })
    expect(votes.get('v4')!.results[0]).toBe(1)
    expect(votes.get('v4')!.votedUsers.has('alice')).toBe(true)
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({
      type: 'voteUpdate', voteId: 'v4', results: [1, 0], total: 1,
    })
  })

  it('voteSubmit 同一人不能重复投票', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v5', question: 'Q?', options: ['A', 'B'],
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'v5', optionIndex: 0, from: 'alice',
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'v5', optionIndex: 1, from: 'alice',
    })
    expect(votes.get('v5')!.results).toEqual([1, 0])
  })

  it('voteSubmit optionIndex 越界被忽略', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v6', question: 'Q?', options: ['A', 'B'],
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'v6', optionIndex: 5, from: 'alice',
    })
    expect(votes.get('v6')!.votedUsers.size).toBe(0)
  })

  it('voteSubmit 不存在的 voteId 静默忽略', () => {
    expect(() => handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'missing', optionIndex: 0, from: 'alice',
    })).not.toThrow()
  })

  it('voteEnd 广播最终结果 + 清理状态', () => {
    handleClassMessage(makeMockPeer(), {
      type: 'voteStart', classId: 1, voteId: 'v7', question: 'Q?', options: ['A', 'B'],
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteSubmit', classId: 1, voteId: 'v7', optionIndex: 0, from: 'alice',
    })
    handleClassMessage(makeMockPeer(), {
      type: 'voteEnd', classId: 1, voteId: 'v7',
    })
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({
      type: 'voteEnd', voteId: 'v7', results: [1, 0], total: 1,
    })
    expect(votes.has('v7')).toBe(false)
  })
})

describe('ws/class: quickAnswer 抢答状态机', () => {
  let listener: any
  beforeEach(() => {
    listener = makeMockPeer({ userId: 1, userName: 'a' })
    handleClassMessage(listener, { type: 'join', classId: 1, userId: 1, from: 'a' })
    listener.send.mockClear()
  })

  it('quickAnswerStart 启动抢答 + 广播', () => {
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerStart', classId: 1, question: 'Q?' })
    expect(quickAnswers.has(1)).toBe(true)
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({ type: 'quickAnswerStart', question: 'Q?' })
  })

  it('quickAnswerSubmit 首人获胜', () => {
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerStart', classId: 1, question: 'Q?' })
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerSubmit', classId: 1, from: 'alice' })
    expect(quickAnswers.get(1)!.winner).toBe('alice')
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({ type: 'quickAnswerResult', winner: 'alice' })
  })

  it('quickAnswerSubmit 已有 winner 时被忽略', () => {
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerStart', classId: 1, question: 'Q?' })
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerSubmit', classId: 1, from: 'alice' })
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerSubmit', classId: 1, from: 'bob' })
    expect(quickAnswers.get(1)!.winner).toBe('alice')
  })

  it('quickAnswerEnd 广播 + 清理', () => {
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerStart', classId: 1, question: 'Q?' })
    handleClassMessage(makeMockPeer(), { type: 'quickAnswerEnd', classId: 1 })
    const sends = sendsOf(listener)
    expect(sends).toContainEqual({ type: 'quickAnswerEnd' })
    expect(quickAnswers.has(1)).toBe(false)
  })
})

describe('ws/class: cleanupClassPeer', () => {
  it('离开时广播 offline + 离开房间', () => {
    const peer = makeMockPeer({ userId: 5, userName: 'alice' })
    handleClassMessage(peer, { type: 'join', classId: 1, userId: 5, from: 'alice' })
    // 加入第二个 peer 来接收 offline 广播
    const peer2 = makeMockPeer({ userId: 6, userName: 'bob' })
    handleClassMessage(peer2, { type: 'join', classId: 1, userId: 6, from: 'bob' })
    peer2.send.mockClear()
    cleanupClassPeer(peer)
    expect(classRooms.get(1)?.has(peer)).toBe(false)
    const sends = sendsOf(peer2)
    expect(sends).toContainEqual({
      type: 'onlineUpdate', classId: 1, userId: 5, from: 'alice', online: false,
    })
  })

  it('未加入任何班级时静默返回', () => {
    const peer = makeMockPeer()
    expect(() => cleanupClassPeer(peer)).not.toThrow()
  })

  it('未登录用户（无 userId）只离开房间不广播', () => {
    const peer = makeMockPeer()
    handleClassMessage(peer, { type: 'join', classId: 1 })
    // peer 没有 _userId
    cleanupClassPeer(peer)
    expect(classRooms.get(1)?.has(peer)).toBeFalsy()
  })
})
