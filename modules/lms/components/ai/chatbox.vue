<template>
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <!-- 标题 -->
        <div v-if="title" class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium text-sm">
            <UIcon name="i-lucide-bot" class="text-blue-500 size-4" />
            <span>{{ title }}</span>
        </div>

        <!-- 聊天界面 -->
        <div class="flex flex-col" :class="heightClass">
            <!-- 消息列表 -->
            <div ref="msgListRef" class="flex-1 overflow-y-auto p-3 space-y-3" @scroll="onScroll">
                <div v-for="(msg, idx) in messages" :key="idx" class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
                    <div class="shrink-0 size-7 rounded-full flex items-center justify-center"
                        :class="msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'">
                        <UIcon :name="msg.role === 'user' ? 'i-lucide-user' : 'i-lucide-bot'" class="size-4" />
                    </div>
                    <div class="max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed"
                        :class="msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'">
                        <!-- 思考过程（可折叠） -->
                        <div v-if="msg.reasoning" class="mb-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                            <div class="flex items-center gap-1 cursor-pointer select-none hover:opacity-70" @click="toggleReasoning(idx)">
                                <UIcon :name="msg._reasoningExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-gray-400" />
                                <span class="text-xs text-gray-400 dark:text-gray-500">{{ t('ueditor.aichatReasoning') }}</span>
                            </div>
                            <div v-if="msg._reasoningExpanded" class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed" v-html="renderContent(msg.reasoning)" />
                        </div>
                        <!-- 消息内容（ueditorRender 可直接渲染 markdown 文本，包括 question 语法） -->
                        <ueditorRender :json="msg.content" />
                        <!-- 朗读按钮（仅 assistant 文本消息） -->
                        <div v-if="canSpeak(msg)" class="flex justify-end mt-1">
                            <button type="button"
                                class="text-xs flex items-center gap-1 transition-colors"
                                :class="speakingIdx === idx ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'"
                                @click="toggleSpeakMessage(idx)">
                                <UIcon :name="speakingIdx === idx ? 'i-lucide-square' : 'i-lucide-volume-2'" class="size-3" />
                                <span>{{ speakingIdx === idx ? t('ai.stopSpeaking') : t('ai.speak') }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 加载中 -->
                <div v-if="loading" class="flex gap-2">
                    <div class="shrink-0 size-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                        <UIcon name="i-lucide-bot" class="size-4" />
                    </div>
                    <div class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-1" />
                        {{ t('ueditor.aichatThinking') }}
                    </div>
                </div>
            </div>

            <!-- 输入区 -->
            <div class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <!-- 监听状态 / 语音错误 -->
                <div v-if="isListening || interimText || voiceError" class="px-3 pt-2 flex items-center gap-2 text-xs flex-wrap">
                    <span v-if="isListening" class="flex items-center gap-1 text-red-500">
                        <span class="size-2 rounded-full bg-red-500 animate-pulse" />
                        {{ t('ai.listening') }}
                    </span>
                    <span v-if="interimText" class="text-gray-500 dark:text-gray-400 truncate max-w-full">{{ interimText }}</span>
                    <span v-if="voiceError" class="text-red-500">{{ voiceError }}</span>
                </div>

                <div class="flex gap-2 px-3 py-2">
                    <UInput
                        v-model="inputText"
                        :placeholder="placeholder || t('ueditor.aichatInputPlaceholder')"
                        size="sm"
                        class="flex-1"
                        @keydown.enter="handleSend"
                        :disabled="loading || disabled"
                    />
                    <!-- 语音输入 -->
                    <UButton
                        v-if="enableVoiceInput && asrSupported"
                        :icon="isListening ? 'i-lucide-square' : 'i-lucide-mic'"
                        :color="isListening ? 'error' : 'neutral'"
                        :variant="isListening ? 'solid' : 'outline'"
                        size="sm"
                        :title="isListening ? t('ai.stopListening') : t('ai.startListening')"
                        @click="toggleVoiceInput"
                    />
                    <!-- 语音输出开关 -->
                    <UButton
                        v-if="enableVoiceOutput && ttsSupported"
                        :icon="voiceOutputEnabled ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
                        :color="voiceOutputEnabled ? 'primary' : 'neutral'"
                        variant="outline"
                        size="sm"
                        :title="t('ai.voiceOutput')"
                        @click="toggleVoiceOutput"
                    />
                    <UButton
                        icon="i-lucide-send"
                        color="primary"
                        size="sm"
                        :loading="loading"
                        :disabled="!inputText.trim() || disabled"
                        @click="handleSend"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { createASRService, createTTSService } from '../../utils/ai'
import { feedVrmAudio, clearVrmAudio } from '../../utils/vrm'
// 聊天框组件：支持 API 模式（SSE 流式）和本地模式（customSend），含语音输入输出

interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string | any
    reasoning?: string
    _reasoningExpanded?: boolean
    _isJson?: boolean
    _spoken?: boolean
}

const props = withDefaults(defineProps<{
    title?: string
    placeholder?: string
    opening?: string
    preset?: string
    model?: string
    thinking?: boolean
    apiUrl?: string
    /** 自定义消息发送函数，用于本地模型等场景。返回完整响应内容，或通过回调流式更新 */
    customSend?: (messages: ChatMessage[], onChunk: (content: string, reasoning?: string) => void) => Promise<{ content: string; reasoning?: string } | void>
    /** 启用语音输入（ASR），默认 true */
    enableVoiceInput?: boolean
    /** 启用语音输出（TTS），默认 true */
    enableVoiceOutput?: boolean
    /** 语音语言代码，默认随 i18n locale 推断 */
    voiceLang?: string
    /** TTS 语音性别，默认 female（全部女声） */
    ttsGender?: 'female' | 'male'
    /** 禁用输入与发送（如本地模型加载中/未就绪） */
    disabled?: boolean
    /** 聊天界面高度 class（可传响应式，如 h-[200px] sm:h-[450px]） */
    heightClass?: string
}>(), {
    enableVoiceInput: true,
    enableVoiceOutput: true,
    ttsGender: 'female',
    disabled: false,
    heightClass: 'h-[450px]',
})

const emit = defineEmits<{
    message: [msg: ChatMessage]
    error: [error: Error]
    chunk: [content: string]
    'user-message': [text: string]
}>()

const { t, locale } = useI18n()
const { user } = useAuth()
const toast = useToast()

const msgListRef = ref<HTMLElement | null>(null)
const inputText = ref('')
const loading = ref(false)
const messages = ref<ChatMessage[]>([])
const userScrolledUp = ref(false)

// ===================== 语音相关 =====================
const asrService = createASRService()
const ttsService = createTTSService()
// SSR 阶段为 false，onMounted 后再赋真实值，避免水合不一致
const asrSupported = ref(false)
const ttsSupported = ref(false)

const isListening = ref(false)
const interimText = ref('')
const voiceError = ref('')
const voiceOutputEnabled = ref(false)
const speakingIdx = ref(-1)

// 根据界面语言推断语音语言
const effectiveVoiceLang = computed(() => {
    if (props.voiceLang) return props.voiceLang
    const l = locale.value
    if (l.startsWith('zh')) return 'zh-CN'
    if (l.startsWith('ja')) return 'ja-JP'
    if (l.startsWith('ko')) return 'ko-KR'
    if (l.startsWith('en')) return 'en-US'
    return 'en-US'
})

// 是否已登录
const isLoggedIn = computed(() => !!user.value)

// 初始化开场消息 + 检测语音支持（仅客户端）
onMounted(() => {
    asrSupported.value = asrService.isSupported()
    ttsSupported.value = ttsService.isSupported()
    if (props.opening) {
        messages.value.push({ role: 'assistant', content: props.opening })
    }
})

// 渲染纯文本内容（简单Markdown）
function renderContent(text: string) {
    if (!text) return ''
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto my-1"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-black/5 dark:bg-white/10 px-1 rounded text-xs">$1</code>')
        .replace(/\n/g, '<br>')
}

// 滚动处理
function onScroll() {
    if (!msgListRef.value) return
    const { scrollTop, scrollHeight, clientHeight } = msgListRef.value
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

// 折叠思考过程
function toggleReasoning(idx: number) {
    const container = msgListRef.value
    const prevScrollHeight = container?.scrollHeight || 0
    const prevScrollTop = container?.scrollTop || 0

    if (messages.value[idx]) {
        messages.value[idx]._reasoningExpanded = !messages.value[idx]._reasoningExpanded
        messages.value = [...messages.value]

        nextTick(() => {
            if (container) {
                container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight)
            }
        })
    }
}

// ===================== 语音输入 (ASR) =====================
function toggleVoiceInput() {
    if (isListening.value) {
        asrService.stop()
        isListening.value = false
        interimText.value = ''
        return
    }
    voiceError.value = ''
    interimText.value = ''
    asrService.start({
        lang: effectiveVoiceLang.value,
        continuous: true,
        interimResults: true,
        onResult: (transcript, isFinal) => {
            if (isFinal) {
                const sep = inputText.value && !inputText.value.endsWith(' ') ? ' ' : ''
                inputText.value = inputText.value + sep + transcript
                interimText.value = ''
            } else {
                interimText.value = transcript
            }
        },
        onError: (errorMsg) => {
            voiceError.value = errorMsg
            isListening.value = false
            interimText.value = ''
        },
        onEnd: () => {
            isListening.value = false
            interimText.value = ''
        },
    }).then(() => {
        isListening.value = true
    }).catch((e: any) => {
        voiceError.value = e?.message || String(e)
        isListening.value = false
    })
}

// ===================== 语音输出 (TTS) =====================
function canSpeak(msg: ChatMessage): boolean {
    if (!props.enableVoiceOutput || !ttsSupported.value) return false
    if (msg.role !== 'assistant' || msg._isJson) return false
    const text = typeof msg.content === 'string' ? msg.content : ''
    return text.trim().length > 0
}

async function speakMessage(idx: number) {
    const msg = messages.value[idx]
    if (!msg || !canSpeak(msg)) return
    const text = String(msg.content || '')
    if (!text.trim()) return

    msg._spoken = true
    messages.value = [...messages.value]
    speakingIdx.value = idx
    // 停掉之前的朗读，避免队列堆积
    ttsService.stop()
    try {
        await ttsService.speak({
            text,
            lang: effectiveVoiceLang.value,
            gender: props.ttsGender,
            // 口型同步只在真实播放语音时驱动：开始时喂入文本，结束时清空
            onStart: () => feedVrmAudio(text),
            onEnd: () => clearVrmAudio(),
        })
    } catch (e: any) {
        voiceError.value = e?.message || String(e)
    } finally {
        if (speakingIdx.value === idx) speakingIdx.value = -1
    }
}

function toggleSpeakMessage(idx: number) {
    if (speakingIdx.value === idx) {
        ttsService.stop()
        speakingIdx.value = -1
    } else {
        speakMessage(idx)
    }
}

function toggleVoiceOutput() {
    voiceOutputEnabled.value = !voiceOutputEnabled.value
    if (voiceOutputEnabled.value) {
        // 开启时朗读最近一条未读 assistant 消息
        for (let i = messages.value.length - 1; i >= 0; i--) {
            if (canSpeak(messages.value[i]) && !messages.value[i]._spoken) {
                speakMessage(i)
                break
            }
        }
    } else {
        ttsService.stop()
        speakingIdx.value = -1
    }
}

// 响应完成时自动朗读（loading 由 true→false）
watch(loading, (isLoading) => {
    if (!isLoading && voiceOutputEnabled.value) {
        for (let i = messages.value.length - 1; i >= 0; i--) {
            if (canSpeak(messages.value[i]) && !messages.value[i]._spoken) {
                speakMessage(i)
                break
            }
        }
    }
})

// 发送消息（接受可选的外部文本，用于程序化调用如 evaluation 答题反馈）
async function handleSend(externalText?: string | Event) {
    const text = (typeof externalText === 'string' ? externalText : inputText.value).trim()
    if (!text || loading.value || props.disabled) return

    // 未登录检查
    if (!isLoggedIn.value) {
        toast.add({ title: t('common.loginRequired'), color: 'warning' })
        return
    }

    // 若正在听写，先停止
    if (isListening.value) {
        asrService.stop()
        isListening.value = false
        interimText.value = ''
    }

    messages.value.push({ role: 'user', content: text })
    // 仅当从输入框发送时清空（程序化调用不清空输入框）
    if (typeof externalText !== 'string') inputText.value = ''
    userScrolledUp.value = false
    scrollToBottom()
    emit('user-message', text)

    const apiMessages: ChatMessage[] = []
    if (props.preset) {
        apiMessages.push({ role: 'system', content: props.preset })
    }
    for (const msg of messages.value) {
        apiMessages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) })
    }

    loading.value = true
    scrollToBottom()

    try {
        // 如果有自定义发送函数，使用它（用于本地模型）
        if (props.customSend) {
            let assistantMsg: ChatMessage = { role: 'assistant', content: '', reasoning: '', _reasoningExpanded: false }
            messages.value.push(assistantMsg)

            const result = await props.customSend(apiMessages, (content, reasoning) => {
                assistantMsg.content += content
                if (reasoning) assistantMsg.reasoning += reasoning
                messages.value = [...messages.value]
                scrollToBottom()
                emit('chunk', content)
            })

            // 如果返回了结果对象，使用它（非流式场景）
            if (result && typeof result === 'object' && 'content' in result) {
                assistantMsg.content = result.content
                assistantMsg.reasoning = result.reasoning || ''
                messages.value = [...messages.value]
            }

            emit('message', assistantMsg)
            return
        }

        // 默认使用 API 调用
        const resp = await fetch(props.apiUrl || '/api/aichat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                model: props.model,
                thinking: props.thinking,
            }),
        })

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}))
            throw new Error(errData.msg || resp.statusText)
        }

        const reader = resp.body?.getReader()
        if (!reader) throw new Error('No reader available')

        const decoder = new TextDecoder()
        let assistantMsg: ChatMessage | null = null
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
                        messages.value.push(assistantMsg)
                    }

                    if (delta.reasoning_content) {
                        assistantMsg.reasoning += delta.reasoning_content
                        messages.value = [...messages.value]
                        scrollToBottom()
                    }

                    if (delta.content) {
                        assistantMsg.content += delta.content
                        messages.value = [...messages.value]
                        scrollToBottom()
                        emit('chunk', delta.content)
                    }
                } catch { /* skip */ }
            }
        }

        if (assistantMsg) {
            emit('message', assistantMsg)
        }
    } catch (e: any) {
        messages.value.push({ role: 'assistant', content: `Error: ${e.message}` })
        emit('error', e)
    } finally {
        loading.value = false
        scrollToBottom()
    }
}

// 组件卸载时清理语音资源
onBeforeUnmount(() => {
    asrService.abort()
    ttsService.stop()
})

// 暴露方法：添加消息、清空消息
defineExpose({
    addMessage(msg: ChatMessage) {
        messages.value.push(msg)
        scrollToBottom()
    },
    clearMessages() {
        messages.value = []
    },
    getMessages() {
        return messages.value
    },
    refreshMessages() {
        messages.value = [...messages.value]
    },
    send(text: string) {
        if (typeof text === 'string' && text.trim()) handleSend(text)
    },
})
</script>
