<template>
  <div class="group-chat w-full flex flex-col h-full">
    <!-- 消息列表 -->
    <div ref="msgListRef" class="chatroom-messages flex-1 min-h-0">
      <div v-if="!messages.length" class="text-center py-8 text-gray-400 text-sm">
        {{ $t('chatroom.empty') }}
      </div>
      <div v-for="(msg, idx) in messages" :key="idx" class="chatroom-msg" :class="{ 'is-self': msg.userId === userId }">
        <UAvatar :src="msg.avatarImg || undefined" :alt="msg.from" size="sm"
          :text="msg.from?.charAt(0)" class="shrink-0" />
        <div class="chatroom-msg-body">
          <div class="chatroom-msg-meta">
            <span class="chatroom-msg-name">{{ msg.from }}</span>
            <span class="chatroom-msg-time">{{ formatTime(msg.ts) }}</span>
          </div>
          <div class="chatroom-msg-text">{{ msg.text }}</div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chatroom-input-area mt-3">
      <UInput v-model="inputText" :placeholder="$t('chatroom.inputPlaceholder')" size="sm"
        class="flex-1" @keydown.enter="sendMessage" :disabled="!canChat" />
      <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim() || !canChat"
        @click="sendMessage" />
    </div>
    <p v-if="!canChat" class="text-xs text-gray-400 mt-1">{{ cannotChatReason }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  groupId: string
}>()

const { user } = useAuth()
const { t } = useI18n()
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
</script>

<style scoped>
.chatroom-messages {
  overflow-y: auto;
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dark .chatroom-messages {
  background: #111827;
}

.chatroom-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.chatroom-msg.is-self {
  flex-direction: row-reverse;
}
.chatroom-msg.is-self .chatroom-msg-meta {
  flex-direction: row-reverse;
}
.chatroom-msg.is-self .chatroom-msg-text {
  background: #6366f1;
  color: #fff;
}

.chatroom-msg-body {
  min-width: 0;
  max-width: 80%;
  display: flex;
  flex-direction: column;
}

.chatroom-msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.chatroom-msg-name {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}
.dark .chatroom-msg-name {
  color: #9ca3af;
}
.chatroom-msg-time {
  font-size: 11px;
  color: #9ca3af;
}

.chatroom-msg-text {
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  word-break: break-word;
  white-space: pre-wrap;
}
.dark .chatroom-msg-text {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

.chatroom-input-area {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
