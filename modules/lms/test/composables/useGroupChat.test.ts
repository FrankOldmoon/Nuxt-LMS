/**
 * useGroupChat composable 测试
 * @see modules/lms/composables/useGroupChat.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockAuthUser,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useWebSocket（auto-imported）
  ;(globalThis as any).useWebSocket = () => ({
    wsConnected: ref(false),
    connect: () => {},
    joinGroup: () => {},
    leaveGroup: () => {},
    sendGroupChat: () => {},
    onGroupChat: (cb: (data: any) => void) => {
      ;(globalThis as any)._groupChatHandler = cb
      return () => {}
    },
  })
})

describe('composables/useGroupChat', () => {
  it('初始 messages 为空数组', async () => {
    setMockAuthUser(null)
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { messages, inputText } = useGroupChat({ groupId: 'grp-1' })
    expect(messages.value).toEqual([])
    expect(inputText.value).toBe('')
  })

  it('canChat 依赖 userId、groupId 和 wsConnected', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    // wsConnected 为 false
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { canChat, cannotChatReason } = useGroupChat({ groupId: 'grp-1' })
    expect(canChat.value).toBe(false)
    expect(cannotChatReason.value).toBeTruthy() // 'chatroom.connecting' 等
  })

  it('cannotChatReason 未登录时返回 needLogin', async () => {
    setMockAuthUser(null)
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { cannotChatReason } = useGroupChat({ groupId: 'grp-1' })
    expect(cannotChatReason.value).toBe('chatroom.needLogin')
  })

  it('cannotChatReason 无 groupId 时返回 selectGroup', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { cannotChatReason } = useGroupChat({ groupId: '' })
    expect(cannotChatReason.value).toBe('coursePanel.selectGroup')
  })

  it('sendMessage 空文本时不发送', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    let sent = false
    ;(globalThis as any).useWebSocket = () => ({
      wsConnected: ref(true),
      connect: () => {},
      joinGroup: () => {},
      leaveGroup: () => {},
      sendGroupChat: () => { sent = true },
      onGroupChat: () => () => {},
    })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { sendMessage, inputText } = useGroupChat({ groupId: 'grp-1' })
    inputText.value = '   '
    sendMessage()
    expect(sent).toBe(false)
  })

  it('sendMessage 有文本且 canChat 时发送', async () => {
    setMockAuthUser({ id: 1, name: 'Alice', avatarImg: '/avatar.png' })
    let sentData: any = null
    ;(globalThis as any).useWebSocket = () => ({
      wsConnected: ref(true),
      connect: () => {},
      joinGroup: () => {},
      leaveGroup: () => {},
      sendGroupChat: (groupId: string, userId: number, from: string, avatarImg: string | null, text: string) => {
        sentData = { groupId, userId, from, avatarImg, text }
      },
      onGroupChat: () => () => {},
    })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { sendMessage, inputText } = useGroupChat({ groupId: 'grp-1' })
    inputText.value = 'hello world'
    sendMessage()
    expect(sentData).not.toBeNull()
    expect(sentData.text).toBe('hello world')
    expect(sentData.groupId).toBe('grp-1')
    expect(sentData.userId).toBe(1)
    expect(inputText.value).toBe('') // 发送后清空
  })

  it('formatTime 格式化时间戳', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { formatTime } = useGroupChat({ groupId: 'grp-1' })
    const ts = new Date(2024, 0, 1, 9, 30).getTime()
    const formatted = formatTime(ts)
    expect(formatted).toBe('09:30')
  })

  it('formatTime 0 时返回空字符串', async () => {
    setMockAuthUser({ id: 1, name: 'Alice' })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { formatTime } = useGroupChat({ groupId: 'grp-1' })
    expect(formatTime(0)).toBe('')
  })

  it('userId 和 userName 从 user 派生', async () => {
    setMockAuthUser({ id: 42, name: 'Bob' })
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { userId } = useGroupChat({ groupId: 'grp-1' })
    expect(userId.value).toBe(42)
  })

  it('userId 无用户时为 0', async () => {
    setMockAuthUser(null)
    const { useGroupChat } = await import('../../composables/useGroupChat')
    const { userId } = useGroupChat({ groupId: 'grp-1' })
    expect(userId.value).toBe(0)
  })
})
