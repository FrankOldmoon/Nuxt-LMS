/**
 * composables/useMessages 测试
 * @see modules/base/composables/useMessages.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
  dispatchWsHandler,
} from '../../../../test/setup/nuxt-stubs'

// useUnreadCounts 是 auto-import，未在 nuxt-stubs 中暴露，需手动 stub
function stubUnreadCounts() {
  ;(globalThis as any).useUnreadCounts = () => ({
    counts: computed(() => ({ notifyUnread: 0, msgUnread: 0 })),
    refresh: async () => {},
  })
}

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  stubUnreadCounts()
  setMockAuthUser({ id: 1, username: 'alice', name: 'Alice' })
})

describe('composables/useMessages - 初始状态', () => {
  it('conversations/messages/searchResults 初始为空', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { conversations, messages, searchResults, selectedUserId, inputText, sending, msgLoading } = useMessages(ref(false))
    expect(conversations.value).toEqual([])
    expect(messages.value).toEqual([])
    expect(searchResults.value).toEqual([])
    expect(selectedUserId.value).toBe(0)
    expect(inputText.value).toBe('')
    expect(sending.value).toBe(false)
    expect(msgLoading.value).toBe(false)
  })
})

describe('composables/useMessages - selectConversation / startConversation', () => {
  it('selectConversation 设置 selectedUserId 并加载消息', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/messages/list')) {
        return { data: [{ id: 1, content: 'hi', senderUserId: 2 }], success: true, msg: '' }
      }
      if (url.includes('/api/messages/conversations')) {
        return { data: [{ userId: 2, name: 'Bob' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMessages } = await import('../../composables/useMessages')
    const { selectConversation, selectedUserId, messages } = useMessages(ref(true))
    selectConversation(2)
    expect(selectedUserId.value).toBe(2)
    await vi.waitFor(() => {
      // messages 被 reverse()
      expect(messages.value).toHaveLength(1)
    })
  })

  it('startConversation 设置 selectedUserId 和 cache', async () => {
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useMessages } = await import('../../composables/useMessages')
    const { startConversation, selectedUserId, selectedUser, searchResults } = useMessages(ref(true))
    startConversation({ id: 5, name: 'Carol', avatarImg: 'http://x/c.png' })
    expect(selectedUserId.value).toBe(5)
    expect(selectedUser.value.name).toBe('Carol')
    expect(selectedUser.value.avatarImg).toBe('http://x/c.png')
    expect(searchResults.value).toEqual([])
  })
})

describe('composables/useMessages - loadConversations', () => {
  it('isOpen 打开时加载会话列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/messages/conversations')) {
        return { data: [{ userId: 2, name: 'Bob' }, { userId: 3, name: 'Carol' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMessages } = await import('../../composables/useMessages')
    const isOpen = ref(false)
    const { conversations } = useMessages(isOpen)
    isOpen.value = true
    await vi.waitFor(() => {
      expect(conversations.value).toHaveLength(2)
    })
  })
})

describe('composables/useMessages - sendMessage', () => {
  it('空文本或未选用户时不发送', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { sendMessage, sending } = useMessages(ref(true))
    await sendMessage()
    expect(sending.value).toBe(false)
  })

  it('发送成功后追加消息并清空 inputText', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/messages/send')) {
        return { data: { id: 10, content: 'hello', senderUserId: 1 }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMessages } = await import('../../composables/useMessages')
    const { selectedUserId, inputText, sendMessage, messages } = useMessages(ref(true))
    selectedUserId.value = 2
    inputText.value = 'hello'
    await sendMessage()
    expect(messages.value).toHaveLength(1)
    expect(messages.value[0].content).toBe('hello')
    expect(inputText.value).toBe('')
  })

  it('发送失败时弹错误 toast', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'blocked' }))
    const { useMessages } = await import('../../composables/useMessages')
    const { selectedUserId, inputText, sendMessage } = useMessages(ref(true))
    selectedUserId.value = 2
    inputText.value = 'hi'
    await sendMessage()
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(inputText.value).toBe('hi') // 失败时保留输入
  })
})

describe('composables/useMessages - onSearchInput', () => {
  it('空关键字时清空 searchResults', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { searchKeyword, searchResults, onSearchInput } = useMessages(ref(true))
    searchKeyword.value = 'abc'
    searchResults.value = [{ id: 1 }]
    searchKeyword.value = ''
    onSearchInput()
    expect(searchResults.value).toEqual([])
  })

  it('有关键字时（300ms 防抖后）请求搜索结果', async () => {
    vi.useFakeTimers()
    try {
      setMockFetchHandler(async (url) => {
        if (url.includes('/api/users/search')) {
          return { data: [{ id: 5, name: 'Carol' }], success: true, msg: '' }
        }
        return { data: null, success: true, msg: '' }
      })
      const { useMessages } = await import('../../composables/useMessages')
      const { searchKeyword, searchResults, onSearchInput } = useMessages(ref(true))
      searchKeyword.value = 'car'
      onSearchInput()
      // 防抖 300ms
      vi.advanceTimersByTime(350)
      await vi.waitFor(() => {
        expect(searchResults.value).toHaveLength(1)
        expect(searchResults.value[0].name).toBe('Carol')
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('composables/useMessages - formatMsgTime', () => {
  it('空时间戳返回空字符串', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { formatMsgTime } = useMessages(ref(false))
    expect(formatMsgTime('')).toBe('')
  })

  it('当天时间返回时分格式', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { formatMsgTime } = useMessages(ref(false))
    const now = new Date()
    const result = formatMsgTime(now.toISOString())
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('composables/useMessages - WebSocket 消息', () => {
  it('收到 message 且为当前会话时追加到 messages', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/messages/list')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMessages } = await import('../../composables/useMessages')
    const { selectedUserId, messages } = useMessages(ref(true))
    selectedUserId.value = 2
    dispatchWsHandler('message', { message: { id: 99, content: 'ws msg', senderUserId: 2 } })
    await vi.waitFor(() => {
      expect(messages.value.some((m: any) => m.id === 99)).toBe(true)
    })
  })

  it('收到 message 但非当前会话时不追加', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { selectedUserId, messages } = useMessages(ref(true))
    selectedUserId.value = 2
    messages.value = []
    dispatchWsHandler('message', { message: { id: 88, content: 'other', senderUserId: 3 } })
    expect(messages.value).toHaveLength(0)
  })

  it('弹窗关闭时不处理 WS 消息', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const { messages } = useMessages(ref(false))
    dispatchWsHandler('message', { message: { id: 77 } })
    expect(messages.value).toHaveLength(0)
  })
})

describe('composables/useMessages - watch isOpen 关闭', () => {
  it('关闭弹窗时清空 selectedUserId / messages / inputText', async () => {
    const { useMessages } = await import('../../composables/useMessages')
    const isOpen = ref(true)
    const { selectedUserId, messages, inputText } = useMessages(isOpen)
    selectedUserId.value = 5
    messages.value = [{ id: 1 }]
    inputText.value = 'draft'
    isOpen.value = false
    await vi.waitFor(() => {
      expect(selectedUserId.value).toBe(0)
      expect(messages.value).toEqual([])
      expect(inputText.value).toBe('')
    })
  })
})
