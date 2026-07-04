<template>
    <div class="chatroom-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <!-- 标题栏 -->
        <div class="flex items-center gap-3 mb-3 pr-6">
            <span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded text-xs font-medium">
                {{ $t('chatroom.label') }}
            </span>
            <span class="font-semibold text-gray-800 dark:text-gray-200">{{ $t('chatroom.title') }}</span>
            <span class="text-xs text-gray-400">{{ $t('chatroom.classOnly') }}</span>
            <div class="flex items-center gap-2 ml-auto">
                <span class="text-xs text-gray-400 flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3.5" />
                    {{ onlineCount }}
                </span>
            </div>
        </div>

        <!-- 消息列表 -->
        <div ref="msgListRef" class="chatroom-messages">
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
        <div class="chatroom-input-area">
            <UInput v-model="inputText" :placeholder="$t('chatroom.inputPlaceholder')" size="sm"
                class="flex-1" @keydown.enter="sendMessage" :disabled="!canChat" />
            <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim() || !canChat"
                @click="sendMessage" />
        </div>
        <p v-if="!canChat" class="text-xs text-gray-400 mt-1">{{ cannotChatReason }}</p>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const { user } = useAuth()
const { t } = useI18n()
const { wsConnected, connect, joinClass, sendChatroom, onChatroom } = useWebSocket()

const userId = computed(() => user.value?.id || 0)
const classId = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)
const userName = computed(() => user.value?.name || 'anonymous')
const avatarImg = computed(() => user.value?.avatarImg || null)

// 是否可聊天：已登录 + 有班级 + ws 已连接
const canChat = computed(() => !!userId.value && !!classId.value && wsConnected.value)
const cannotChatReason = computed(() => {
    if (!userId.value) return t('chatroom.needLogin')
    if (!classId.value) return t('chatroom.needClass')
    if (!wsConnected.value) return t('chatroom.connecting')
    return ''
})

// 消息列表（仅内存，不持久化）
const messages = ref([])
const inputText = ref('')
const msgListRef = ref(null)
const onlineCount = ref(0)

// 监听聊天室消息
onChatroom((data) => {
    // 仅显示本班级消息（服务端已按 classId 房间广播，二次校验更稳妥）
    if (data.classId !== classId.value) return
    messages.value.push({
        userId: data.userId,
        from: data.from,
        avatarImg: data.avatarImg,
        text: data.text,
        ts: data.ts,
    })
    // 限制消息数量（保留最近 200 条）
    if (messages.value.length > 200) {
        messages.value = messages.value.slice(-200)
    }
    nextTick(scrollToBottom)
})

function sendMessage() {
    const text = inputText.value.trim()
    if (!text || !canChat.value) return
    sendChatroom(classId.value, userId.value, userName.value, avatarImg.value, text)
    inputText.value = ''
}

function scrollToBottom() {
    const el = msgListRef.value
    if (el) el.scrollTop = el.scrollHeight
}

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 确保 ws 连接并加入班级房间（ws.vue 已自动处理，这里做兜底）
onMounted(() => {
    if (classId.value && !wsConnected.value) {
        connect()
    }
})
</script>

<style scoped>
.chatroom-messages {
    height: 320px;
    overflow-y: auto;
    padding: 8px;
    background: #f9fafb;
    border-radius: 6px;
    margin-bottom: 12px;
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
