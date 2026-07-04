<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-2xl' }" scrollable>
    <template #content>
      <div class="flex" style="height: 70vh;">
        <!-- 左侧：会话列表 -->
        <div class="w-64 shrink-0 border-r border-default flex flex-col">
          <div class="p-3 border-b border-default">
            <h3 class="text-sm font-semibold">{{ $t('message.title') }}</h3>
          </div>
          <!-- 搜索用户 -->
          <div class="p-2 border-b border-default">
            <UInput v-model="searchKeyword" :placeholder="$t('message.searchUser')" icon="i-lucide-search"
              size="xs" class="w-full" @input="onSearchInput" />
            <div v-if="searchResults.length" class="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
              <button v-for="u in searchResults" :key="u.id"
                class="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-muted text-left"
                @click="startConversation(u)">
                <UAvatar :src="u.avatarImg || undefined" :alt="u.name" size="2xs" :text="u.name?.charAt(0)" />
                <span class="text-xs truncate">{{ u.name }}</span>
              </button>
            </div>
          </div>
          <!-- 会话列表 -->
          <div class="flex-1 overflow-y-auto">
            <button v-for="conv in conversations" :key="conv.userId"
              class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left transition-colors"
              :class="selectedUserId === conv.userId ? 'bg-primary/10' : ''"
              @click="selectConversation(conv.userId)">
              <div class="relative shrink-0">
                <UAvatar :src="conv.avatarImg || undefined" :alt="conv.name" size="xs" :text="conv.name?.charAt(0)" />
                <span v-if="conv.unreadCount > 0"
                  class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium truncate">{{ conv.name }}</div>
                <div class="text-[10px] text-muted truncate">{{ conv.lastMessage?.text || $t('message.empty') }}</div>
              </div>
            </button>
            <div v-if="!conversations.length" class="text-center text-xs text-muted py-8">
              {{ $t('message.noConversations') }}
            </div>
          </div>
        </div>

        <!-- 右侧：聊天区域 -->
        <div class="flex-1 flex flex-col min-w-0">
          <template v-if="selectedUserId">
            <!-- 聊天头部 -->
            <div class="flex items-center gap-2 p-3 border-b border-default">
              <UAvatar :src="selectedUser?.avatarImg || undefined" :alt="selectedUser?.name" size="xs"
                :text="selectedUser?.name?.charAt(0)" />
              <span class="text-sm font-medium">{{ selectedUser?.name }}</span>
            </div>
            <!-- 消息列表 -->
            <div ref="msgContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
              <div v-if="msgLoading" class="flex justify-center py-4">
                <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-muted" />
              </div>
              <div v-else-if="!messages.length" class="text-center text-xs text-muted py-8">
                {{ $t('message.empty') }}
              </div>
              <div v-for="msg in messages" :key="msg.id"
                class="flex" :class="msg.senderUserId === user?.id ? 'justify-end' : 'justify-start'">
                <div class="max-w-[70%] rounded-lg px-3 py-1.5 text-sm"
                  :class="msg.senderUserId === user?.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-default'">
                  <p class="break-words">{{ msg.content?.text || '' }}</p>
                  <p class="text-[9px] mt-0.5 opacity-60">{{ formatTime(msg.createdAt) }}</p>
                </div>
              </div>
            </div>
            <!-- 输入框 -->
            <div class="p-3 border-t border-default flex gap-2">
              <UInput v-model="inputText" :placeholder="$t('message.inputPlaceholder')" class="flex-1"
                size="sm" @keyup.enter="sendMessage" />
              <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim()"
                :loading="sending" @click="sendMessage" />
            </div>
          </template>
          <div v-else class="flex-1 flex items-center justify-center text-sm text-muted">
            {{ $t('message.selectConversation') }}
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })

const { t } = useI18n()
const { user } = useAuth()
const toast = useToast()
const { onMessage } = useWebSocket()
const { refresh: refreshUnread } = useUnreadCounts()

const conversations = ref([])
const selectedUserId = ref(0)
const selectedUserCache = ref(null) // 缓存从搜索选中的用户信息，避免会话未入库时头部空白
const messages = ref([])
const msgLoading = ref(false)
const inputText = ref('')
const sending = ref(false)
const msgContainer = ref(null)

// 搜索
const searchKeyword = ref('')
const searchResults = ref([])
let searchTimer = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const kw = searchKeyword.value.trim()
  if (!kw) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const data = await cRequest(`/api/lms/users/search?keyword=${encodeURIComponent(kw)}`)
      searchResults.value = data || []
    } catch { searchResults.value = [] }
  }, 300)
}

function startConversation(u) {
  selectedUserId.value = u.id
  selectedUserCache.value = { name: u.name, avatarImg: u.avatarImg }
  searchKeyword.value = ''
  searchResults.value = []
  loadMessages()
}

function selectConversation(userId) {
  selectedUserId.value = userId
  selectedUserCache.value = null // 从会话列表选中，优先用 conversations 数据
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
    const data = await cRequest('/api/lms/messages/conversations')
    conversations.value = data || []
  } catch { conversations.value = [] }
}

async function loadMessages() {
  if (!selectedUserId.value) return
  msgLoading.value = true
  try {
    const data = await cRequest(`/api/lms/messages/list?userId=${selectedUserId.value}`)
    messages.value = (data || []).reverse() // 倒序返回，反转为正序显示
    nextTick(() => {
      if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    })
    // 刷新会话列表（已读标记）
    loadConversations()
  } catch { messages.value = [] }
  finally { msgLoading.value = false }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || !selectedUserId.value) return
  sending.value = true
  try {
    const msg = await cRequest('/api/lms/messages/send', {
      method: 'POST',
      body: { receiverUserId: selectedUserId.value, content: text },
    })
    messages.value.push(msg)
    inputText.value = ''
    nextTick(() => {
      if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    })
    // 刷新会话列表
    loadConversations()
  } catch (err) {
    toast.add({ title: err.message || t('message.sendFailed'), color: 'error' })
  } finally {
    sending.value = false
  }
}

function formatTime(ts) {
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

// WebSocket 实时消息：收到新消息时更新 UI
onMessage((data) => {
  const msg = data.message
  if (!msg) return

  if (isOpen.value && msg.senderUserId === selectedUserId.value) {
    // 当前正在和对方聊天，直接追加并标记已读
    messages.value.push(msg)
    nextTick(() => {
      if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    })
    // 重新加载消息会触发标记已读
    loadMessages()
  } else {
    // 未打开弹窗或不在当前会话：刷新会话列表 + 刷新未读数
    if (isOpen.value) loadConversations()
    refreshUnread()
  }
})
</script>
