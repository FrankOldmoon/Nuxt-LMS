import { inject, provide, type InjectionKey } from 'vue'
import { createASRService, createTTSService } from '../utils/ai'
import { feedVrmAudio, clearVrmAudio } from '../utils/vrm'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | any
  reasoning?: string
  _reasoningExpanded?: boolean
  _userToggled?: boolean
  /** 是否为流式进行中的消息：流式期间 content 用轻量渲染，结束后富文本化 */
  _streaming?: boolean
  _isJson?: boolean
  _spoken?: boolean
}

interface ChatboxProps {
  title?: string
  placeholder?: string
  opening?: string
  preset?: string
  model?: string
  thinking?: boolean
  apiUrl?: string
  customSend?: (messages: ChatMessage[], onChunk: (content: string, reasoning?: string) => void) => Promise<{ content: string; reasoning?: string } | void>
  enableVoiceInput?: boolean
  enableVoiceOutput?: boolean
  voiceLang?: string
  ttsGender?: 'female' | 'male'
  disabled?: boolean
  heightClass?: string
}

const ChatboxKey = Symbol('Chatbox') as InjectionKey<ReturnType<typeof useChatbox>>

export function provideChatbox(ctx: ReturnType<typeof useChatbox>) {
  provide(ChatboxKey, ctx)
}

export function useChatboxContext() {
  const ctx = inject(ChatboxKey)
  if (!ctx) throw new Error('useChatboxContext must be used within AiChatbox')
  return ctx
}

/**
 * 聊天框：消息收发 + SSE 流式 + 语音输入输出(ASR/TTS) + 思考过程折叠
 */
export function useChatbox(
  props: ChatboxProps,
  emit: (event: string, ...args: any[]) => void,
) {
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
  const asrSupported = ref(false)
  const ttsSupported = ref(false)
  const isListening = ref(false)
  const interimText = ref('')
  const voiceError = ref('')
  const voiceOutputEnabled = ref(false)
  const speakingIdx = ref(-1)

  const effectiveVoiceLang = computed(() => {
    if (props.voiceLang) return props.voiceLang
    const l = locale.value
    if (l.startsWith('zh')) return 'zh-CN'
    if (l.startsWith('ja')) return 'ja-JP'
    if (l.startsWith('ko')) return 'ko-KR'
    if (l.startsWith('en')) return 'en-US'
    return 'en-US'
  })

  const isLoggedIn = computed(() => !!user.value)

  onMounted(() => {
    asrSupported.value = asrService.isSupported()
    ttsSupported.value = ttsService.isSupported()
    if (props.opening) {
      messages.value.push({ role: 'assistant', content: props.opening })
    }
  })

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

  function toggleReasoning(idx: number) {
    const container = msgListRef.value
    const prevScrollHeight = container?.scrollHeight || 0
    const prevScrollTop = container?.scrollTop || 0

    if (messages.value[idx]) {
      messages.value[idx]._reasoningExpanded = !messages.value[idx]._reasoningExpanded
      // 标记用户已主动操作过，后续流式自动展开/折叠不再覆盖该消息
      messages.value[idx]._userToggled = true
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
    ttsService.stop()
    try {
      await ttsService.speak({
        text,
        lang: effectiveVoiceLang.value,
        gender: props.ttsGender,
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
      for (let i = messages.value.length - 1; i >= 0; i--) {
        const m = messages.value[i]
        if (m && canSpeak(m) && !m._spoken) {
          speakMessage(i)
          break
        }
      }
    } else {
      ttsService.stop()
      speakingIdx.value = -1
    }
  }

  watch(loading, (isLoading) => {
    if (!isLoading && voiceOutputEnabled.value) {
      for (let i = messages.value.length - 1; i >= 0; i--) {
        const m = messages.value[i]
        if (m && canSpeak(m) && !m._spoken) {
          speakMessage(i)
          break
        }
      }
    }
  })

  // ===================== 发送消息 =====================
  async function handleSend(externalText?: string | Event) {
    const text = (typeof externalText === 'string' ? externalText : inputText.value).trim()
    if (!text || loading.value || props.disabled) return

    if (!isLoggedIn.value) {
      toast.add({ title: t('common.loginRequired'), color: 'warning' })
      return
    }

    if (isListening.value) {
      asrService.stop()
      isListening.value = false
      interimText.value = ''
    }

    messages.value.push({ role: 'user', content: text })
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
      if (props.customSend) {
        let assistantMsg: ChatMessage = { role: 'assistant', content: '', reasoning: '', _reasoningExpanded: false, _streaming: true }
        messages.value.push(assistantMsg)
        // 注意：push 后局部 assistantMsg 仍是原始对象，写入不触发 Vue 响应式
        // 必须通过 messages.value 里的 reactive proxy 修改，消息组件才会计依赖并实时重渲染
        const liveMsg = messages.value[messages.value.length - 1] as ChatMessage

        const result = await props.customSend(apiMessages, (content, reasoning) => {
          if (reasoning) {
            liveMsg.reasoning += reasoning
            // 思考中自动展开：仅当正文尚未开始（content 为空）时展开，避免反复横跳
            if (!liveMsg._userToggled && !liveMsg.content) liveMsg._reasoningExpanded = true
          }
          if (content) {
            liveMsg.content += content
            // 正文一旦开始，折叠思考过程并锁定；之后 reasoning 到来也不会再展开
            if (!liveMsg._userToggled && liveMsg.content && liveMsg.reasoning) {
              liveMsg._reasoningExpanded = false
            }
          }
          messages.value = [...messages.value]
          scrollToBottom()
          emit('chunk', content)
        })

        if (result && typeof result === 'object' && 'content' in result) {
          liveMsg.content = result.content
          liveMsg.reasoning = result.reasoning || ''
          messages.value = [...messages.value]
        }

        // 流式结束：切换为富文本渲染
        liveMsg._streaming = false
        messages.value = [...messages.value]

        emit('message', liveMsg)
        return
      }

      // 默认使用 API 调用（SSE 流式）
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
      let liveMsg: ChatMessage | null = null
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
              assistantMsg = { role: 'assistant', content: '', reasoning: '', _reasoningExpanded: false, _streaming: true }
              messages.value.push(assistantMsg)
            }
            // push 后局部 assistantMsg 仍是原始对象，写入不触发 Vue 响应式；
            // 必须通过 messages.value 里的 reactive proxy 修改，消息组件才会计依赖并实时重渲染
            if (!liveMsg) liveMsg = messages.value[messages.value.length - 1] as ChatMessage

            if (delta.reasoning_content) {
              liveMsg.reasoning += delta.reasoning_content
              // 思考中自动展开：仅当正文尚未开始（content 为空）时展开，避免反复横跳
              if (!liveMsg._userToggled && !liveMsg.content) liveMsg._reasoningExpanded = true
              messages.value = [...messages.value]
              scrollToBottom()
            }

            if (delta.content) {
              liveMsg.content += delta.content
              // 正文一旦开始，折叠思考过程并锁定；之后 reasoning 到来也不会再展开
              if (!liveMsg._userToggled && liveMsg.content && liveMsg.reasoning) {
                liveMsg._reasoningExpanded = false
              }
              messages.value = [...messages.value]
              scrollToBottom()
              emit('chunk', delta.content)
            }
          } catch { /* skip */ }
        }
      }

      if (liveMsg) {
        // 流式结束：切换为富文本渲染
        liveMsg._streaming = false
        messages.value = [...messages.value]
        emit('message', liveMsg)
      }
    } catch (e: any) {
      messages.value.push({ role: 'assistant', content: `Error: ${e.message}` })
      emit('error', e)
    } finally {
      loading.value = false
      scrollToBottom()
    }
  }

  onBeforeUnmount(() => {
    asrService.abort()
    ttsService.stop()
  })

  return {
    // 消息
    msgListRef, inputText, loading, messages, userScrolledUp,
    onScroll, scrollToBottom, toggleReasoning, renderContent, handleSend,
    // 语音
    asrSupported, ttsSupported, isListening, interimText, voiceError,
    voiceOutputEnabled, speakingIdx,
    toggleVoiceInput, canSpeak, toggleSpeakMessage, toggleVoiceOutput,
  }
}
