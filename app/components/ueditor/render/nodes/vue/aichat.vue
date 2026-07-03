<template>
    <div class="aichat-render-container">
        <!-- 标题 -->
        <div v-if="config.title" class="aichat-render-title">
            <UIcon name="i-lucide-bot" class="text-blue-500" />
            <span>{{ config.title }}</span>
        </div>

        <!-- 聊天界面 -->
        <div class="aichat-render-body">
            <!-- 消息列表 -->
            <div ref="msgListRef" class="aichat-messages" @scroll="onScroll">
                <div v-for="(msg, idx) in chatMessages" :key="idx" class="aichat-msg" :class="msg.role">
                    <div class="aichat-msg-avatar">
                        <UIcon :name="msg.role === 'user' ? 'i-lucide-user' : 'i-lucide-bot'" />
                    </div>
                    <div class="aichat-msg-content">
                        <!-- 思考过程（可折叠） -->
                        <div v-if="msg.reasoning" class="aichat-reasoning">
                            <div class="aichat-reasoning-toggle" @click="toggleReasoning(idx)">
                                <UIcon :name="msg._reasoningExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3" />
                                <span class="text-xs text-gray-400">{{ t('ueditor.aichatReasoning') }}</span>
                            </div>
                            <div v-if="msg._reasoningExpanded" class="aichat-reasoning-body" v-html="renderContent(msg.reasoning)" />
                        </div>
                        <ueditorRender :json="msg.content"/>
                    </div>
                </div>
                <div v-if="streaming" class="aichat-msg assistant">
                    <div class="aichat-msg-avatar"><UIcon name="i-lucide-bot" /></div>
                    <div class="aichat-msg-content">
                        <UIcon name="i-lucide-loader-2" class="animate-spin" /> {{ t('ueditor.aichatThinking') }}
                    </div>
                </div>
            </div>

            <!-- 输入区 -->
            <div class="aichat-input-area">
                <UInput
                    v-model="inputText"
                    :placeholder="t('ueditor.aichatInputPlaceholder')"
                    size="sm"
                    class="flex-1"
                    @keydown.enter="sendMessage"
                    :disabled="streaming"
                />
                <UButton
                    icon="i-lucide-send"
                    color="primary"
                    size="sm"
                    :loading="streaming"
                    :disabled="!inputText.trim()"
                    @click="sendMessage"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})
const { t } = useI18n()

const msgListRef = ref(null)
const inputText = ref('')
const streaming = ref(false)

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
})

const chatMessages = ref([])

onMounted(() => {
    if (config.value.opening) {
        chatMessages.value.push({ role: 'assistant', content: config.value.opening })
    }
})

function renderContent(text) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
}

const userScrolledUp = ref(false)

function onScroll() {
    if (!msgListRef.value) return
    const { scrollTop, scrollHeight, clientHeight } = msgListRef.value
    // 用户不在底部附近时标记为已手动滚动
    userScrolledUp.value = scrollHeight - scrollTop - clientHeight > 60
}

function scrollToBottom() {
    if (userScrolledUp.value) return
    nextTick(() => {
        if (msgListRef.value) {
            msgListRef.value.scrollTop = msgListRef.value.scrollHeight
        }
    })
}

function toggleReasoning(idx) {
    if (chatMessages.value[idx]) {
        // 记录展开前的滚动位置
        const container = msgListRef.value
        const prevScrollHeight = container?.scrollHeight || 0
        const prevScrollTop = container?.scrollTop || 0

        chatMessages.value[idx]._reasoningExpanded = !chatMessages.value[idx]._reasoningExpanded
        chatMessages.value = [...chatMessages.value]

        // 展开后保持视口相对位置不变
        nextTick(() => {
            if (container) {
                const newScrollHeight = container.scrollHeight
                container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
            }
        })
    }
}

async function sendMessage() {
    const text = inputText.value.trim()
    if (!text || streaming.value) return

    chatMessages.value.push({ role: 'user', content: text })
    inputText.value = ''
    userScrolledUp.value = false
    scrollToBottom()

    const apiMessages = []
    if (config.value.preset) {
        apiMessages.push({ role: 'system', content: config.value.preset })
    }
    for (const msg of chatMessages.value) {
        apiMessages.push({ role: msg.role, content: msg.content })
    }

    streaming.value = true
    scrollToBottom()

    try {
        const resp = await fetch('/api/lms/aichat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                apiKey: config.value.apiKey,
                apiUrl: config.value.apiUrl,
                model: config.value.model,
                thinking: config.value.thinking,
            }),
        })

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}))
            chatMessages.value.push({ role: 'assistant', content: `Error: ${errData.msg || resp.statusText}` })
            return
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let assistantMsg = null
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
                if (data === '[DONE]') continue
                try {
                    const json = JSON.parse(data)
                    const delta = json.choices?.[0]?.delta
                    if (!delta) continue

                    if (!assistantMsg) {
                        assistantMsg = { role: 'assistant', content: '', reasoning: '', _reasoningExpanded: false }
                        chatMessages.value.push(assistantMsg)
                    }

                    if (delta.reasoning_content) {
                        assistantMsg.reasoning += delta.reasoning_content
                        chatMessages.value = [...chatMessages.value]
                        scrollToBottom()
                    }

                    if (delta.content) {
                        assistantMsg.content += delta.content
                        chatMessages.value = [...chatMessages.value]
                        scrollToBottom()
                    }
                } catch (_) { /* skip */ }
            }
        }
    } catch (e) {
        chatMessages.value.push({ role: 'assistant', content: `Error: ${e.message}` })
    } finally {
        streaming.value = false
        scrollToBottom()
    }
}
</script>

<style scoped>
.aichat-render-container {
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.aichat-render-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 500;
    font-size: 14px;
}
.aichat-render-body {
    display: flex;
    flex-direction: column;
    height: 450px;
}
.aichat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}
.aichat-msg {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}
.aichat-msg.user {
    flex-direction: row-reverse;
}
.aichat-msg-avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e5e7eb;
    color: #6b7280;
}
.aichat-msg.assistant .aichat-msg-avatar {
    background: #dbeafe;
    color: #2563eb;
}
.aichat-msg-content {
    max-width: 75%;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    background: #f3f4f6;
}
.aichat-msg.user .aichat-msg-content {
    background: #2563eb;
    color: #fff;
}
.aichat-msg-content :deep(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 4px 0;
}
.aichat-msg-content :deep(code) {
    background: rgba(0,0,0,0.06);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 13px;
}
.aichat-msg-content :deep(pre code) {
    background: transparent;
    padding: 0;
}
.aichat-reasoning {
    margin-bottom: 8px;
    border-left: 2px solid #d1d5db;
    padding-left: 8px;
}
.aichat-reasoning-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    user-select: none;
}
.aichat-reasoning-toggle:hover {
    opacity: 0.7;
}
.aichat-reasoning-body {
    margin-top: 4px;
    font-size: 13px;
    color: #9ca3af;
    line-height: 1.5;
}
.aichat-input-area {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
}
</style>
