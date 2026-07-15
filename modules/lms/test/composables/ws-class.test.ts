/**
 * ws/class composable test
 * @see modules/lms/composables/ws/class.ts
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

describe('composables/ws/class', () => {
  it('sendInvite 调用 send 并传递正确参数', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { sendInvite } = useWsClass()
    sendInvite(10, 20, 30, 'teacher')
    expect(sentMsg).toEqual({ type: 'invite', classId: 10, courseId: 20, chapterId: 30, from: 'teacher' })
  })

  it('sendDanmaku 截断超过 200 字符的文本', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { sendDanmaku } = useWsClass()
    const longText = 'x'.repeat(300)
    sendDanmaku(1, longText)
    expect(sentMsg.text.length).toBe(200)
  })

  it('onInvite 注册 handler 并可被 dispatch 触发', async () => {
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: () => {},
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { onInvite } = useWsClass()
    const cb = vi.fn()
    onInvite(cb)
    dispatchWsHandler('invite', { classId: 1 })
    expect(cb).toHaveBeenCalledWith({ classId: 1 })
  })

  it('sendVoteStart / onVoteStart 正确收发', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { sendVoteStart, onVoteStart } = useWsClass()
    const cb = vi.fn()
    onVoteStart(cb)
    sendVoteStart(5, 'vote-1', 'question?', ['A', 'B'])
    expect(sentMsg).toEqual({ type: 'voteStart', classId: 5, voteId: 'vote-1', question: 'question?', options: ['A', 'B'] })
    dispatchWsHandler('voteStart', { voteId: 'vote-1' })
    expect(cb).toHaveBeenCalledWith({ voteId: 'vote-1' })
  })

  it('sendChatroom / onChatroom 正确收发', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { sendChatroom, onChatroom } = useWsClass()
    const cb = vi.fn()
    onChatroom(cb)
    sendChatroom(1, 100, 'alice', null, 'hello')
    expect(sentMsg).toEqual({ type: 'chatroom', classId: 1, userId: 100, from: 'alice', avatarImg: null, text: 'hello' })
    dispatchWsHandler('chatroom', { text: 'hello' })
    expect(cb).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('onChapterAccessUpdate 注册 handler', async () => {
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: () => {},
    })
    const { useWsClass } = await import('../../composables/ws/class')
    const { onChapterAccessUpdate } = useWsClass()
    const cb = vi.fn()
    onChapterAccessUpdate(cb)
    dispatchWsHandler('chapterAccessUpdate', { chapterId: 1 })
    expect(cb).toHaveBeenCalledWith({ chapterId: 1 })
  })
})
