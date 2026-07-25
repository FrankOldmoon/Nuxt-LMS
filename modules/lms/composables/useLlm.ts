/**
 * useLlm — LLM AI 助手组合式函数
 *
 * 集中管理 AiLlm 组件的全部状态与逻辑：配置读写、模式切换、本地模型加载、
 * Ollama 直连流式对话、聊天框参数派生等。通过 provide/inject 与设置面板子组件共享状态。
 *
 * 设计要点：
 * - chatboxRef 由本 composable 持有，refreshMessages/getMessages 供父组件通过 defineExpose 调用
 * - state 为响应式镜像，引擎本身（模块级单例）不进入响应式系统
 * - showSettings=true 时使用内部可编辑 cfg* 状态；否则直接读 prop > lms_config > 硬编码
 */
import { provide, inject, type InjectionKey } from 'vue'
import {
  subscribeLLMState, loadLLM, unloadLLM, chatLLM,
  LOCAL_LLM_MODELS, DEFAULT_LLM_MODEL, DEFAULT_LLM_MODE,
} from '../utils/ai'
import type { LLMMessage } from '../utils/ai'

export interface LlmProps {
  /** 显示参数设置面板（render.vue 复用时设为 false，由 edit.vue 提供参数） */
  showSettings?: boolean
  /** 模式：local 浏览器本地 WebLLM / api 服务端 API / ollama 本地 Ollama（未传则回退 lms_config.ai.mode） */
  mode?: 'local' | 'api' | 'ollama'
  title?: string
  opening?: string
  preset?: string
  /** 模型：local 时为本地模型 ID，api 时为服务端模型名 */
  model?: string
  thinking?: boolean
  apiUrl?: string
  /** TTS 语音性别（未传则回退 lms_config.ai.ttsGender，默认 female） */
  ttsGender?: 'female' | 'male'
  /** 课程级合并后的 AI 配置（由章节页传入，覆盖全局 lms_config） */
  aiConfig?: Record<string, any>
}

export type LlmEmit = (event: 'chunk' | 'user-message' | 'message', ...args: any[]) => void

type LlmCtx = ReturnType<typeof useLlm>
const LlmKey: InjectionKey<LlmCtx> = Symbol('Llm')

export function useLlm(props: LlmProps, emit: LlmEmit) {
  const { t } = useI18n()
  const toast = useToast()

  const { aiConfig: globalAi } = useAiConfig()
  const aiCfg = computed(() => props.aiConfig ?? globalAi.value ?? {})

  const showSettings = computed(() => props.showSettings ?? true)

  const chatboxRef = ref<any>(null)

  function refreshMessages() {
    chatboxRef.value?.refreshMessages()
  }
  function getMessages() {
    return chatboxRef.value?.getMessages()
  }

  // ===================== 可编辑配置（仅 showSettings 时使用，从 prop > lms_config > 硬编码 初始化） =====================
  const cfgMode = ref<'local' | 'api' | 'ollama'>(props.mode ?? aiCfg.value.mode ?? DEFAULT_LLM_MODE)
  const cfgTitle = ref(props.title ?? aiCfg.value.title ?? '')
  const cfgPreset = ref(props.preset ?? aiCfg.value.preset ?? '')
  const cfgOpening = ref(props.opening ?? aiCfg.value.opening ?? '')
  const cfgThinking = ref(props.thinking ?? aiCfg.value.thinking ?? false)
  const cfgApiModel = ref(props.mode === 'api' ? (props.model ?? aiCfg.value.model ?? '') : '')
  const cfgOllamaUrl = ref(props.mode === 'ollama' ? (props.model ?? '') : (aiCfg.value.ollamaUrl || 'http://localhost:11434'))
  const cfgOllamaModel = ref(aiCfg.value.ollamaModel || '')
  const cfgTtsGender = ref<'female' | 'male'>(props.ttsGender ?? aiCfg.value.ttsGender ?? 'female')
  const selectedLocalModel = ref(
    (props.mode === 'local' && props.model && LOCAL_LLM_MODELS.some(m => m.value === props.model))
      ? props.model
      : (aiCfg.value.mode === 'local' && aiCfg.value.model && LOCAL_LLM_MODELS.some(m => m.value === aiCfg.value.model)
        ? aiCfg.value.model
        : DEFAULT_LLM_MODEL),
  )

  const modeOptions = computed(() => [
    { label: t('ai.modeLocal'), value: 'local' },
    { label: t('ai.modeApi'), value: 'api' },
    { label: t('ai.modeOllama'), value: 'ollama' },
  ])

  const genderOptions = computed(() => [
    { label: t('ai.ttsFemale'), value: 'female' },
    { label: t('ai.ttsMale'), value: 'male' },
  ])

  // ===================== 有效配置（showSettings 用内部可编辑状态，否则 prop > lms_config > 硬编码） =====================
  const effMode = computed(() => props.showSettings ? cfgMode.value : (props.mode ?? aiCfg.value.mode ?? DEFAULT_LLM_MODE))
  const effTitle = computed(() => props.showSettings ? cfgTitle.value : (props.title ?? aiCfg.value.title ?? ''))
  const effPreset = computed(() => props.showSettings ? cfgPreset.value : (props.preset ?? aiCfg.value.preset ?? ''))
  const effOpening = computed(() => props.showSettings ? cfgOpening.value : (props.opening ?? aiCfg.value.opening ?? ''))
  const effThinking = computed(() => props.showSettings ? cfgThinking.value : (props.thinking ?? aiCfg.value.thinking ?? false))
  const effApiModel = computed(() => props.showSettings ? cfgApiModel.value : (props.model ?? aiCfg.value.model ?? ''))
  const effTtsGender = computed(() => props.showSettings ? cfgTtsGender.value : (props.ttsGender ?? aiCfg.value.ttsGender ?? 'female'))
  const effApiUrl = computed(() => props.apiUrl ?? aiCfg.value.apiUrl ?? '/api/aichat/chat')
  const effOllamaUrl = computed(() => props.showSettings ? cfgOllamaUrl.value : (aiCfg.value.ollamaUrl || 'http://localhost:11434'))
  const effOllamaModel = computed(() => props.showSettings ? cfgOllamaModel.value : (aiCfg.value.ollamaModel || ''))
  const effLocalModel = computed(() => {
    if (props.showSettings) return selectedLocalModel.value
    const m = props.model ?? aiCfg.value.model
    return LOCAL_LLM_MODELS.some(x => x.value === m) ? (m as string) : DEFAULT_LLM_MODEL
  })

  // ===================== LLM 引擎状态订阅（引擎本身不进入响应式） =====================
  const state = reactive({
    ready: false,
    loading: false,
    progress: 0,
    loadedBytes: '0 MB',
    totalBytes: '',
    error: '',
  })

  const unsubscribe = subscribeLLMState((s) => {
    state.ready = s.ready
    state.loading = s.loading
    state.progress = s.progress
    state.loadedBytes = s.loadedBytes
    state.totalBytes = s.totalBytes
    state.error = s.error
  })

  // ===================== 模型加载/卸载 =====================
  async function loadSelected() {
    try {
      await loadLLM(effLocalModel.value)
      if (props.showSettings) toast.add({ title: t('ai.loadSuccess'), color: 'success' })
    } catch {
      // 错误已写入 state.error
    }
  }

  // 默认自动加载（local 模式）
  onMounted(() => {
    if (effMode.value === 'local') loadSelected()
  })

  // 模式切换：local→api/ollama 卸载，api/ollama→local 加载
  watch(effMode, async (mode) => {
    if (mode === 'local' && !state.ready && !state.loading) {
      await loadSelected()
    } else if ((mode === 'api' || mode === 'ollama') && state.ready) {
      await unloadLLM()
    }
  })

  // 本地模型切换时重新加载
  watch(effLocalModel, async (newModel, oldModel) => {
    if (newModel === oldModel) return
    if (state.ready || state.loading) {
      await unloadLLM()
    }
    if (effMode.value === 'local') {
      await loadSelected()
    }
  })

  /**
   * 自定义发送：桥接 chatbox customSend 到 chatLLM 流式接口
   * chatbox 已把 preset 拼成 system 消息，直接透传即可
   */
  async function handleCustomSend(
    messages: LLMMessage[],
    onChunk: (content: string, reasoning?: string) => void,
  ): Promise<void> {
    await chatLLM(messages, onChunk)
  }

  /**
   * Ollama 直连：浏览器直接调用本地 Ollama 的 OpenAI 兼容接口
   * 需要 Ollama 设置 OLLAMA_ORIGINS=* 允许跨域
   */
  async function handleOllamaSend(
    messages: LLMMessage[],
    onChunk: (content: string, reasoning?: string) => void,
  ): Promise<void> {
    const baseUrl = effOllamaUrl.value.replace(/\/$/, '')
    const model = effOllamaModel.value || 'llama3.2'

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Ollama 请求失败: ${response.status} ${errText}`)
    }

    const reader = response.body!.getReader()
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
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  }

  // ===================== 传给 chatbox 的最终参数 =====================
  const chatboxTitle = computed(() => effTitle.value || (effMode.value === 'local' ? t('ai.webllmTitle') : t('ueditor.aichat')))
  const chatboxPreset = computed(() => effPreset.value || (effMode.value === 'local' ? t('ai.webllmPreset') : 'You are a helpful assistant.'))
  const chatboxOpening = computed(() => effOpening.value || (effMode.value === 'local' ? t('ai.webllmOpening') : ''))
  const chatboxCustomSend = computed(() => {
    if (effMode.value === 'local' && state.ready) return handleCustomSend
    if (effMode.value === 'ollama') return handleOllamaSend
    return undefined
  })
  const chatboxDisabled = computed(() => effMode.value === 'local' && !state.ready)
  const chatboxApiUrl = computed(() => (effMode.value === 'api' ? effApiUrl.value : undefined))
  const chatboxModel = computed(() => (effMode.value === 'api' ? effApiModel.value : undefined))
  const chatboxThinking = computed(() => (effMode.value === 'api' ? effThinking.value : undefined))

  // ===================== chatbox 事件转发（命名函数，避免内联表达式） =====================
  function onChunk(c: string) { emit('chunk', c) }
  function onUserMessage(txt: string) { emit('user-message', txt) }
  function onMessage(msg: any) { emit('message', msg) }

  // 卸载时仅取消订阅（引擎为模块级单例，多实例共享，不在此释放）
  onBeforeUnmount(() => {
    unsubscribe()
  })

  const ctx = {
    showSettings,
    t,
    // 可编辑配置（设置面板用）
    cfgMode, cfgTitle, cfgPreset, cfgOpening, cfgThinking,
    cfgApiModel, cfgOllamaUrl, cfgOllamaModel, cfgTtsGender, selectedLocalModel,
    modeOptions, genderOptions,
    state,
    loadSelected, unloadLLM, LOCAL_LLM_MODELS,
    // 有效配置（主模板用）
    effMode, effTtsGender,
    // chatbox 参数（主模板用）
    chatboxRef, chatboxTitle, chatboxOpening, chatboxPreset,
    chatboxCustomSend, chatboxModel, chatboxThinking, chatboxApiUrl, chatboxDisabled,
    // 事件转发（主模板用）
    onChunk, onUserMessage, onMessage,
    // 暴露给父组件
    refreshMessages, getMessages,
  }

  provide(LlmKey, ctx)

  return ctx
}

export function useLlmContext(): LlmCtx {
  const ctx = inject(LlmKey)
  if (!ctx) throw new Error('useLlmContext 必须在调用过 useLlm 的组件内使用')
  return ctx
}
