import type { Ref, InjectionKey } from 'vue'

type MessagesContext = ReturnType<typeof useMessages>

const MESSAGES_KEY: InjectionKey<MessagesContext> = Symbol('messages')

export function provideMessages(ctx: MessagesContext) {
  provide(MESSAGES_KEY, ctx)
}

export function useMessagesContext(): MessagesContext {
  const ctx = inject(MESSAGES_KEY)
  if (!ctx) throw new Error('useMessagesContext must be used within a MessageModal')
  return ctx
}

/**
 * 消息中心：会话列表 + 搜索 + 消息收发 + WebSocket 实时
 */
export function useMessages(isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const { user } = useAuth()
  const toast = useToast()
  const { refresh: refreshUnread } = useUnreadCounts()

  const conversations = ref<any[]>([])
  const selectedUserId = ref(0)
  const selectedUserCache = ref<any>(null)
  const messages = ref<any[]>([])
  const msgLoading = ref(false)
  const inputText = ref('')
  const sending = ref(false)
  const msgContainer = ref<HTMLElement | null>(null)

  // 搜索
  const searchKeyword = ref('')
  const searchResults = ref<any[]>([])
  let searchTimer: any = null

  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer)
    const kw = searchKeyword.value.trim()
    if (!kw) { searchResults.value = []; return }
    searchTimer = setTimeout(async () => {
      try {
        const data = await cRequest(`/api/users/search?keyword=${encodeURIComponent(kw)}`)
        searchResults.value = data || []
      } catch { searchResults.value = [] }
    }, 300)
  }

  function startConversation(u: any) {
    selectedUserId.value = u.id
    selectedUserCache.value = { name: u.name, avatarImg: u.avatarImg }
    searchKeyword.value = ''
    searchResults.value = []
    loadMessages()
  }

  function selectConversation(userId: number) {
    selectedUserId.value = userId
    selectedUserCache.value = null
    loadMessages()
  }

  const selectedUser = computed(() => {
    const conv = conversations.value.find(c => c.userId === selectedUserId.value)
    if (conv) return { name: conv.name, avatarImg: conv.avatarImg }
    if (selectedUserCache.value) return selectedUserCache.value
    const sr = searchResults.value.find(s => s.id === selectedUserId.value)
    return sr || null
  })

  async function loadConversations() {
    try {
      const data = await cRequest('/api/messages/conversations')
      conversations.value = data || []
    } catch { conversations.value = [] }
  }

  async function loadMessages() {
    if (!selectedUserId.value) return
    msgLoading.value = true
    try {
      const data = await cRequest(`/api/messages/list?userId=${selectedUserId.value}`)
      messages.value = (data || []).reverse()
      nextTick(() => {
        if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
      })
      loadConversations()
    } catch { messages.value = [] }
    finally { msgLoading.value = false }
  }

  async function sendMessage() {
    const text = inputText.value.trim()
    if (!text || !selectedUserId.value) return
    sending.value = true
    try {
      const msg = await cRequest('/api/messages/send', {
        method: 'POST',
        body: { receiverUserId: selectedUserId.value, content: text },
      })
      messages.value.push(msg)
      inputText.value = ''
      nextTick(() => {
        if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
      })
      loadConversations()
    } catch (err: any) {
      toast.add({ title: err.message || t('message.sendFailed'), color: 'error' })
    } finally {
      sending.value = false
    }
  }

  function formatMsgTime(ts: string) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  watch(isOpen, (val) => {
    if (val) {
      loadConversations()
    } else {
      selectedUserId.value = 0
      messages.value = []
      inputText.value = ''
    }
  })

  // WebSocket 实时消息
  registerWsHandler('message', (data: any) => {
    const msg = data.message
    if (!msg) return

    if (isOpen.value && msg.senderUserId === selectedUserId.value) {
      messages.value.push(msg)
      nextTick(() => {
        if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
      })
      loadMessages()
    } else {
      if (isOpen.value) loadConversations()
      refreshUnread()
    }
  })

  return {
    t,
    user,
    conversations,
    selectedUserId,
    selectedUser,
    messages,
    msgLoading,
    inputText,
    sending,
    msgContainer,
    searchKeyword,
    searchResults,
    onSearchInput,
    startConversation,
    selectConversation,
    loadMessages,
    sendMessage,
    formatMsgTime,
  }
}
