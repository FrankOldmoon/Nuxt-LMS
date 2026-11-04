<template>
  <div class="h-full flex overflow-hidden">
    <!-- 左：会话记录 -->
    <ChatConversationList
      :conversations="conversations"
      :current-id="activeId"
      @create="createConversation"
      @select="selectConversation"
      @rename="renameConversation"
      @delete="askDelete"
      @pin="togglePin"
    />

    <!-- 中：聊天 -->
    <div class="flex-1 min-w-0 flex flex-col bg-default">
      <!-- 工具条 -->
      <div class="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-default">
        <UIcon name="i-lucide-sparkles" class="size-4 text-primary" />
        <span class="text-sm font-medium truncate">{{ activeConversation?.title || $t('chat.untitled') }}</span>
        <UBadge v-if="modelName" color="neutral" variant="soft" size="sm" class="shrink-0">
          {{ modelName }}
        </UBadge>
        <div class="ml-auto flex items-center gap-1 shrink-0">
          <UTooltip :text="panelOpen ? $t('chat.collapse') : $t('chat.expand')">
            <UButton
              :icon="panelOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="panelOpen = !panelOpen"
            />
          </UTooltip>
        </div>
      </div>

      <!-- 未登录提示 -->
      <div v-if="!isLoggedIn" class="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <UIcon name="i-lucide-lock" class="size-10 text-dimmed" />
        <p class="text-sm text-muted">{{ $t('chat.loginRequired') }}</p>
        <UButton color="primary" @click="openLogin">{{ $t('auth.login') }}</UButton>
      </div>

      <!-- 聊天区 -->
      <div v-else class="flex-1 min-h-0 flex justify-center">
        <div class="chat-main w-full max-w-5xl flex flex-col min-h-0">
          <!-- 空态 -->
          <div v-if="!chat.messages.value.length" class="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <UIcon name="i-lucide-message-square-dashed" class="size-10 text-dimmed" />
            <p class="text-sm text-muted">{{ $t('chat.noConversation') }}</p>
          </div>
          <AiChatboxMessageList v-else />

          <!-- 工具执行状态 -->
          <div v-if="toolStatus" class="px-3 py-1 flex items-center gap-1.5 text-xs text-muted shrink-0 border-t border-default">
            <UIcon name="i-lucide-loader-2" class="size-3 animate-spin text-primary" />
            {{ toolStatus }}
          </div>

          <AiChatboxInputBar
            :placeholder="inputPlaceholder"
            :enable-voice-input="true"
            :enable-voice-output="false"
            :disabled="modeDisabled"
          />
        </div>
      </div>
    </div>

    <!-- 右：运行 / 文件 -->
    <div v-if="panelOpen" class="w-[440px] shrink-0 hidden xl:flex flex-col border-l border-default">
      <div class="h-9 shrink-0 flex items-center gap-1 px-1.5 border-b border-default">
        <UButton
          size="xs"
          color="neutral"
          :variant="panelTab === 'run' ? 'soft' : 'ghost'"
          icon="i-lucide-terminal"
          :label="$t('chat.tabRun')"
          @click="panelTab = 'run'"
        />
        <UButton
          size="xs"
          color="neutral"
          :variant="panelTab === 'files' ? 'soft' : 'ghost'"
          icon="i-lucide-folder-tree"
          :label="$t('chat.tabFiles')"
          @click="switchToFiles"
        />
      </div>
      <div class="flex-1 min-h-0">
        <ChatRunPanel v-if="panelTab === 'run'" :content="panelContent" />
        <ChatFileTree v-else ref="fileTreeRef" :conversation-id="activeId" />
      </div>
    </div>
  </div>

  <!-- 登录弹窗 -->
  <LazyAuthLoginModal v-if="loginOpen" v-model:open="loginOpen" />

  <!-- 删除确认 -->
  <UModal v-model:open="deleteOpen" :title="$t('chat.deleteConfirm')">
    <template #body>
      <p class="text-sm text-muted">{{ $t('chat.deleteConfirmDesc') }}</p>
      <p class="mt-1 text-sm font-medium truncate">{{ deleteTarget?.title }}</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ $t('chat.cancel') }}</UButton>
        <UButton color="error" @click="confirmDelete">{{ $t('chat.delete') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * /chat — AI 对话工作台
 *
 * 三栏：会话记录 | 聊天框 | 代码运行效果
 *
 * 复用：
 * - lms 的 useChatbox / AiChatboxMessageList / AiChatboxInputBar（SSE 流式、思考链折叠、ASR）
 * - lms 的 useAiConfig（系统设置 → lms_config.ai：model / mode / thinking / preset）
 * - base 的 ide runners（python / javascript / cpp / java / sql / pseudocode）
 * - 已有的 /api/aichat/chat 代理（Key 只在服务端，走 SSE 透传）
 *
 * 会话与消息持久化在本模块的 chat_conversations / chat_messages。
 */
definePageMeta({ layout: 'chat' })

const { t } = useI18n()
const toast = useToast()
const { user, hasRole } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const { aiConfig } = useAiConfig()

// ===================== 模型配置 =====================
const modelName = computed(() => {
  const c = aiConfig.value as any
  if (c.mode === 'ollama') return c.ollamaModel || 'ollama'
  return c.model || ''
})
const modeDisabled = computed(() => (aiConfig.value as any)?.mode === 'local')
const inputPlaceholder = computed(() => {
  if (modeDisabled.value) return t('chat.unsupported')
  return t('ueditor.aichatInputPlaceholder')
})

// ===================== 会话列表 =====================
interface Conversation {
  id: number
  title: string
  pinned?: boolean
  messageCount?: number
  lastMessageAt?: string
}

const conversations = ref<Conversation[]>([])
const activeId = ref(0)
const activeConversation = computed(() => conversations.value.find((c) => c.id === activeId.value) || null)

async function loadConversations() {
  if (!isLoggedIn.value) return
  try {
    const rows = await cRequest<Conversation[]>('/api/chat/conversations')
    conversations.value = rows || []
  } catch (e: any) {
    console.error('[chat] load conversations failed', e)
  }
}

async function createConversation() {
  if (!isLoggedIn.value) return
  if (chat.loading.value) return
  try {
    const row = await cRequest<Conversation>('/api/chat/conversations', {
      method: 'POST',
      body: { model: modelName.value || undefined },
    })
    conversations.value.unshift(row)
    activeId.value = row.id
    chat.messages.value = []
    chat.inputText.value = ''
    refreshPanel()
  } catch (e: any) {
    toast.add({ title: t('chat.loadFailed'), description: e?.message, color: 'error' })
  }
}

async function selectConversation(c: Conversation) {
  if (c.id === activeId.value) return
  if (chat.loading.value) {
    toast.add({ title: '正在回复中，稍后再切换', color: 'warning' })
    return
  }
  activeId.value = c.id
  chat.messages.value = []
  refreshPanel()
  try {
    const rows = await cRequest<any[]>(`/api/chat/messages?id=${c.id}`)
    chat.messages.value = (rows || []).map((r) => ({
      role: r.role,
      content: r.content || '',
      reasoning: r.reasoning || undefined,
      _reasoningExpanded: false,
      _streaming: false,
    })) as any[]
    refreshPanel()
  } catch (e: any) {
    toast.add({ title: t('chat.loadFailed'), description: e?.message, color: 'error' })
  }
}

async function renameConversation(c: Conversation, title: string) {
  try {
    await cRequest('/api/chat/conversation', { method: 'PATCH', body: { id: c.id, title } })
    c.title = title
  } catch (e: any) {
    toast.add({ title: t('chat.renameFailed'), description: e?.message, color: 'error' })
  }
}

async function togglePin(c: Conversation, pinned: boolean) {
  try {
    await cRequest('/api/chat/conversation', { method: 'PATCH', body: { id: c.id, pinned } })
    c.pinned = pinned
    conversations.value = [...conversations.value].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    })
  } catch (e: any) {
    toast.add({ title: t('chat.renameFailed'), description: e?.message, color: 'error' })
  }
}

// 删除确认
const deleteOpen = ref(false)
const deleteTarget = ref<Conversation | null>(null)

function askDelete(c: Conversation) {
  deleteTarget.value = c
  deleteOpen.value = true
}

async function confirmDelete() {
  const c = deleteTarget.value
  deleteOpen.value = false
  if (!c) return
  try {
    await cRequest('/api/chat/conversation/delete', { method: 'POST', body: { id: c.id } })
    conversations.value = conversations.value.filter((x) => x.id !== c.id)
    if (activeId.value === c.id) {
      activeId.value = 0
      chat.messages.value = []
      refreshPanel()
    }
  } catch (e: any) {
    toast.add({ title: t('chat.deleteFailed'), description: e?.message, color: 'error' })
  }
}

// ===================== Ollama 直连（系统设置 mode=ollama 时）=====================
async function ollamaSend(
  messages: { role: string; content: string }[],
  onChunk: (content: string, reasoning?: string) => void,
) {
  const cfg = aiConfig.value as any
  const base = String(cfg.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = cfg.ollamaModel || 'llama3.2'
  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  })
  if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${await resp.text().catch(() => '')}`)
  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta
        if (delta?.content) onChunk(delta.content)
      } catch { /* skip */ }
    }
  }
}

// ===================== Agent 工具循环 =====================
const toolStatus = ref('')
const fileTreeRef = ref<any>(null)
const panelTab = ref<'run' | 'files'>('run')

const agent = useAgentChat({
  conversationId: () => activeId.value,
  model: () => (aiConfig.value as any)?.model,
  thinking: () => !!(aiConfig.value as any)?.thinking,
  onToolCall: (call, status) => {
    toolStatus.value = status === 'start'
      ? t('chat.toolRunning', { name: call.name })
      : ''
  },
  onFilesChanged: () => {
    // 文件树在「文件」页签时才需要刷新
    if (panelTab.value === 'files') fileTreeRef.value?.load?.()
  },
})

function switchToFiles() {
  // ChatFileTree 挂载时 watch(conversationId, immediate) 会自动拉一次列表
  panelTab.value = 'files'
}

// ===================== 聊天（复用 useChatbox）=====================
const chatProps = reactive<any>({
  preset: '',
  apiUrl: '/api/aichat/chat',
  model: undefined,
  thinking: false,
  customSend: undefined,
  enableVoiceInput: true,
  enableVoiceOutput: false,
  disabled: false,
})

// 配置变化时同步到 chatProps（useChatbox 在发送时才读取，响应式同步足够）
watch(aiConfig, (cfg: any) => {
  const mode = cfg?.mode || 'api'
  chatProps.preset = cfg?.preset || ''
  chatProps.model = cfg?.model || undefined
  chatProps.thinking = !!cfg?.thinking
  chatProps.apiUrl = cfg?.apiUrl || '/api/aichat/chat'
  // api 模式走 Agent（带工具），ollama 直连不带工具
  chatProps.customSend = mode === 'ollama' ? ollamaSend : (mode === 'api' ? agent.customSend : undefined)
  chatProps.disabled = mode === 'local'
}, { immediate: true, deep: true })

const chat = useChatbox(chatProps, onChatEvent as any)
provideChatbox(chat)

// ===================== 落库（串行队列，避免乱序）=====================
let persistChain: Promise<any> = Promise.resolve()
function enqueue(task: () => Promise<any>) {
  persistChain = persistChain.then(task).catch((e) => {
    console.error('[chat] persist failed', e)
  })
}

/** 确保有会话：首次发消息时懒创建 */
async function ensureConversation(): Promise<number> {
  if (activeId.value) return activeId.value
  const row = await cRequest<Conversation>('/api/chat/conversations', {
    method: 'POST',
    body: { model: modelName.value || undefined },
  })
  conversations.value.unshift(row)
  activeId.value = row.id
  return row.id
}

async function appendMessages(id: number, messages: any[]) {
  const r = await cRequest<{ title?: string }>('/api/chat/messages', {
    method: 'POST',
    body: { conversation_id: id, messages },
  })
  const conv = conversations.value.find((c) => c.id === id)
  if (conv) {
    if (r?.title) conv.title = r.title
    conv.messageCount = (conv.messageCount || 0) + messages.length
    conv.lastMessageAt = new Date().toISOString()
  }
  return r
}

function onChatEvent(event: string, ...args: any[]) {
  if (event === 'user-message') {
    const text = String(args[0] || '')
    if (!text) return
    enqueue(async () => {
      const id = await ensureConversation()
      await appendMessages(id, [{ role: 'user', content: text, model: modelName.value }])
    })
    return
  }

  if (event === 'message') {
    const msg = args[0]
    if (!msg) return
    const payload = [{
      role: 'assistant',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      reasoning: msg.reasoning || undefined,
      // 本轮工具轨迹（读了哪些文件、跑了什么代码），回看时能看到
      toolCalls: agent.trace.value.length ? JSON.stringify(agent.trace.value) : undefined,
      model: modelName.value,
    }]
    enqueue(async () => {
      const id = await ensureConversation()
      await appendMessages(id, payload)
    })
    return
  }

  if (event === 'error') {
    console.error('[chat] stream error', args[0])
  }
}

// ===================== 右侧运行面板 =====================
const panelOpen = ref(true)
const panelContent = ref('')

/** 取最近一条含代码块的 assistant 回复（流式期间不重算，避免每 delta 跑正则） */
function refreshPanel() {
  const msgs = chat.messages.value
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role === 'assistant' && typeof m.content === 'string' && m.content.includes('```')) {
      panelContent.value = m.content
      return
    }
  }
  panelContent.value = ''
}

// 流式期间也更新右侧面板：按 600ms 节流，避免每个 delta 都跑正则
let lastPanelSync = 0
watch(
  () => {
    const msgs = chat.messages.value
    const last = msgs[msgs.length - 1]
    if (!last || typeof last.content !== 'string') return String(msgs.length)
    return `${msgs.length}:${last.content.length}`
  },
  () => {
    const now = Date.now()
    if (chat.loading.value && now - lastPanelSync < 600) return
    lastPanelSync = now
    refreshPanel()
  },
)

// ===================== 登录 / 初始化 =====================
const loginOpen = ref(false)
function openLogin() {
  loginOpen.value = true
}

onMounted(async () => {
  if (!isLoggedIn.value) return
  await loadConversations()
  // 优先打开最近一个有消息的会话；没有则保持空态，等用户开口时懒创建（不留空会话）
  const withMessages = conversations.value.find((c) => (c.messageCount || 0) > 0)
  if (withMessages) await selectConversation(withMessages)
})
</script>

<style scoped>
/* 复用 lms 的 AiChatboxMessageItem 时，把气泡从 75% 放宽到 92%：
   工作台里的回复常带大段代码，75% 会让代码频繁横向滚动（章节内的 aichat 保持原样）。 */
.chat-main :deep([class*="max-w-[75%]"]) {
  max-width: 92%;
}
</style>
