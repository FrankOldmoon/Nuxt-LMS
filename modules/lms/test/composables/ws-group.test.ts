/**
 * ws/group composable 测试
 * @see modules/lms/composables/ws/group.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  dispatchWsHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/ws/group', () => {
  it('joinGroup 添加 groupId 到 joinedGroupIds 并发送消息', async () => {
    const joinedGroupIds = new Set<string>()
    let sentMsgs: any[] = []
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      joinedGroupIds,
      send: (msg: any) => { sentMsgs.push(msg) },
    })
    const { useWsGroup } = await import('../../composables/ws/group')
    const { joinGroup } = useWsGroup()
    joinGroup('grp-1', 100, 'alice')
    expect(joinedGroupIds.has('grp-1')).toBe(true)
    expect(sentMsgs[0]).toEqual({ type: 'joinGroup', groupId: 'grp-1', userId: 100, from: 'alice' })
  })

  it('leaveGroup 从 joinedGroupIds 移除并发送消息', async () => {
    const joinedGroupIds = new Set<string>(['grp-1'])
    let sentMsgs: any[] = []
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      joinedGroupIds,
      send: (msg: any) => { sentMsgs.push(msg) },
    })
    const { useWsGroup } = await import('../../composables/ws/group')
    const { leaveGroup } = useWsGroup()
    leaveGroup('grp-1')
    expect(joinedGroupIds.has('grp-1')).toBe(false)
    expect(sentMsgs[0]).toEqual({ type: 'leaveGroup', groupId: 'grp-1' })
  })

  it('sendGroupChat 发送聊天消息', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      joinedGroupIds: new Set(),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsGroup } = await import('../../composables/ws/group')
    const { sendGroupChat } = useWsGroup()
    sendGroupChat('grp-1', 100, 'alice', '/avatar.png', 'hello')
    expect(sentMsg).toEqual({ type: 'groupChat', groupId: 'grp-1', userId: 100, from: 'alice', avatarImg: '/avatar.png', text: 'hello' })
  })

  it('onGroupChat 注册 handler 并可被 dispatch 触发', async () => {
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      joinedGroupIds: new Set(),
      send: () => {},
    })
    const { useWsGroup } = await import('../../composables/ws/group')
    const { onGroupChat } = useWsGroup()
    const cb = vi.fn()
    onGroupChat(cb)
    dispatchWsHandler('groupChat', { groupId: 'grp-1', text: 'hi' })
    expect(cb).toHaveBeenCalledWith({ groupId: 'grp-1', text: 'hi' })
  })
})
