/**
 * Group chat: WebSocket message send/receive + scroll management
 */
export function useGroupChat(props: { groupId: string }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { wsConnected, connect, joinGroup, leaveGroup, sendGroupChat, onGroupChat } = useWebSocket()

  const userId = computed(() => user.value?.id || 0)
  const userName = computed(() => user.value?.name || 'anonymous')
  const avatarImg = computed(() => user.value?.avatarImg || null)

  const canChat = computed(() => !!userId.value && !!props.groupId && wsConnected.value)
  const cannotChatReason = computed(() => {
    if (!userId.value) return t('chatroom.needLogin')
    if (!props.groupId) return t('coursePanel.selectGroup')
    if (!wsConnected.value) return t('chatroom.connecting')
    return ''
  })

  const messages = ref<Array<{ userId: number; from: string; avatarImg: string | null; text: string; ts: number }>>([])
  const inputText = ref('')
  const msgListRef = ref<HTMLElement | null>(null)

  onGroupChat((data) => {
    if (data.groupId !== props.groupId) return
    messages.value.push({
      userId: data.userId,
      from: data.from,
      avatarImg: data.avatarImg,
      text: data.text,
      ts: data.ts,
    })
    if (messages.value.length > 200) {
      messages.value = messages.value.slice(-200)
    }
    nextTick(scrollToBottom)
  })

  function sendMessage() {
    const text = inputText.value.trim()
    if (!text || !canChat.value) return
    sendGroupChat(props.groupId, userId.value, userName.value, avatarImg.value, text)
    inputText.value = ''
  }

  function scrollToBottom() {
    const el = msgListRef.value
    if (el) el.scrollTop = el.scrollHeight
  }

  function formatTime(ts: number) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  onMounted(() => {
    if (!wsConnected.value) {
      connect()
    }
    if (props.groupId) {
      joinGroup(props.groupId, userId.value, userName.value)
    }
  })

  onUnmounted(() => {
    if (props.groupId) {
      leaveGroup(props.groupId)
    }
  })

  watch(() => props.groupId, (newId, oldId) => {
    if (oldId) leaveGroup(oldId)
    messages.value = []
    if (newId && wsConnected.value) {
      joinGroup(newId, userId.value, userName.value)
    }
  })

  return {
    messages,
    inputText,
    msgListRef,
    canChat,
    cannotChatReason,
    sendMessage,
    scrollToBottom,
    formatTime,
    userId,
  }
}
