/**
 * useLlm — LLM AI assistant composable
 *
 * Centrally manages all state and logic of the AiLlm component: config read/write, mode switching, local model loading,
 * Ollama direct streaming chat, chatbox parameter derivation, etc. Shares state with settings panel sub-components via provide/inject.
 *
 * Design highlights:
 * - chatboxRef is held by this composable; refreshMessages/getMessages are called by the parent component via defineExpose
 * - state is a reactive mirror; the engine itself (module-level singleton) does not enter the reactive system
 * - When showSettings=true, uses internal editable cfg* state; otherwise directly reads prop > lms_config > hardcoded
 */
import { provide, inject, type InjectionKey } from 'vue'
import {
  subscribeLLMState, loadLLM, unloadLLM, chatLLM,
  LOCAL_LLM_MODELS, DEFAULT_LLM_MODEL, DEFAULT_LLM_MODE,
} from '../utils/ai'
import type { LLMMessage } from '../utils/ai'

export interface LlmProps {
  /** Show parameter settings panel (set to false when reusing in render.vue, parameters are provided by edit.vue) */
  showSettings?: boolean
  /** Mode: local browser local WebLLM / api server-side API / ollama local Ollama (falls back to lms_config.ai.mode if not provided) */
  mode?: 'local' | 'api' | 'ollama'
  title?: string
  opening?: string
  preset?: string
  /** Model: local model ID for local mode, server-side model name for api mode */
  model?: string
  thinking?: boolean
  apiUrl?: string
  /** TTS voice gender (falls back to lms_config.ai.ttsGender if not provided, defaults to female) */
  ttsGender?: 'female' | 'male'
  /** Course-level merged AI configuration (passed in by the chapter page, overrides global lms_config) */
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

  // ===================== Editable configuration (only used when showSettings, initialized from prop > lms_config > hardcoded) =====================
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

  // ===================== Effective configuration (showSettings uses internal editable state, otherwise prop > lms_config > hardcoded) =====================
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

  // ===================== LLM engine state subscription (the engine itself does not enter reactivity) =====================
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

  // ===================== Model loading/unloading =====================
  async function loadSelected() {
    try {
      await loadLLM(effLocalModel.value)
      if (props.showSettings) toast.add({ title: t('ai.loadSuccess'), color: 'success' })
    } catch {
      // Error has already been written to state.error
    }
  }

  // Default auto-load (local mode)
  onMounted(() => {
    if (effMode.value === 'local') loadSelected()
  })

  // Mode switching: local→api/ollama unload, api/ollama→local load
  watch(effMode, async (mode) => {
    if (mode === 'local' && !state.ready && !state.loading) {
      await loadSelected()
    } else if ((mode === 'api' || mode === 'ollama') && state.ready) {
      await unloadLLM()
    }
  })

  // Reload when switching local models
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
   * Custom send: bridge chatbox customSend to chatLLM streaming interface
   * chatbox has already concatenated preset into a system message, just pass it through
   */
  async function handleCustomSend(
    messages: LLMMessage[],
    onChunk: (content: string, reasoning?: string) => void,
  ): Promise<void> {
    await chatLLM(messages, onChunk)
  }

  /**
   * Ollama direct connection: the browser directly calls the local Ollama's OpenAI-compatible interface
   * Requires Ollama to set OLLAMA_ORIGINS=* to allow cross-origin
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
      throw new Error(`Ollama request failed: ${response.status} ${errText}`)
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
          // Skip lines that cannot be parsed
        }
      }
    }
  }

  // ===================== Final parameters passed to chatbox =====================
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

  // ===================== chatbox event forwarding (named functions, avoid inline expressions) =====================
  function onChunk(c: string) { emit('chunk', c) }
  function onUserMessage(txt: string) { emit('user-message', txt) }
  function onMessage(msg: any) { emit('message', msg) }

  // On unmount, only cancel subscription (the engine is a module-level singleton, shared across instances, not released here)
  onBeforeUnmount(() => {
    unsubscribe()
  })

  const ctx = {
    showSettings,
    t,
    // Editable configuration (used by settings panel)
    cfgMode, cfgTitle, cfgPreset, cfgOpening, cfgThinking,
    cfgApiModel, cfgOllamaUrl, cfgOllamaModel, cfgTtsGender, selectedLocalModel,
    modeOptions, genderOptions,
    state,
    loadSelected, unloadLLM, LOCAL_LLM_MODELS,
    // Effective configuration (used by main template)
    effMode, effTtsGender,
    // chatbox parameters (used by main template)
    chatboxRef, chatboxTitle, chatboxOpening, chatboxPreset,
    chatboxCustomSend, chatboxModel, chatboxThinking, chatboxApiUrl, chatboxDisabled,
    // Event forwarding (used by main template)
    onChunk, onUserMessage, onMessage,
    // Exposed to parent component
    refreshMessages, getMessages,
  }

  provide(LlmKey, ctx)

  return ctx
}

export function useLlmContext(): LlmCtx {
  const ctx = inject(LlmKey)
  if (!ctx) throw new Error('useLlmContext must be used within a component that has called useLlm')
  return ctx
}
