/**
 * TTS (Text-to-Speech) 工具函数
 * 通过服务端 edge-tts API 合成语音，客户端用 HTMLAudioElement 播放
 *
 * 数据流：speak(text) → POST /api/aichat/tts → MP3 blob → Audio.play()
 */

/** 语音对象（与浏览器 SpeechSynthesisVoice 接口形状兼容，voiceURI 存储 edge-tts 语音名） */
export interface TTSVoice {
  name: string
  lang: string
  voiceURI: string
  default?: boolean
}

/** 兼容旧导入：tts.vue 中 import type { SpeechSynthesisVoice } from ai */
export type SpeechSynthesisVoice = TTSVoice

export interface TTSOptions {
  text: string
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voice?: TTSVoice
  /** 语音性别筛选（仅当未传 voice 时生效） */
  gender?: 'female' | 'male'
  /** 语音开始播放时触发（用于驱动口型同步等） */
  onStart?: () => void
  /** 语音播放结束时触发（正常结束或被取消/出错） */
  onEnd?: () => void
}

export interface TTSService {
  speak: (options: TTSOptions) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  getVoices: () => TTSVoice[]
  getVoicesByLanguage: (lang: string, gender?: 'female' | 'male') => TTSVoice[]
  isSupported: () => boolean
  isSpeaking: () => boolean
  isPaused: () => boolean
}

/**
 * edge-tts 常用语音列表（按语言分组，含男女声）
 * voiceURI 即 edge-tts 语音名，发送到 /api/aichat/tts 的 voice 参数
 */
const EDGE_TTS_VOICES: TTSVoice[] = [
  // 中文
  { name: '晓晓 (女声)', lang: 'zh-CN', voiceURI: 'zh-CN-XiaoxiaoNeural' },
  { name: '云希 (男声)', lang: 'zh-CN', voiceURI: 'zh-CN-YunxiNeural' },
  { name: '晓伊 (女声)', lang: 'zh-CN', voiceURI: 'zh-CN-XiaoyiNeural' },
  { name: '云扬 (男声)', lang: 'zh-CN', voiceURI: 'zh-CN-YunyangNeural' },
  { name: '曉臻 (女声)', lang: 'zh-TW', voiceURI: 'zh-TW-HsiaoChenNeural' },
  { name: '雲瑞 (男声)', lang: 'zh-TW', voiceURI: 'zh-TW-YunJuiNeural' },
  // 英语
  { name: 'Emma (Female)', lang: 'en-US', voiceURI: 'en-US-EmmaMultilingualNeural' },
  { name: 'Jenny (Female)', lang: 'en-US', voiceURI: 'en-US-JennyNeural' },
  { name: 'Guy (Male)', lang: 'en-US', voiceURI: 'en-US-GuyNeural' },
  { name: 'Davis (Male)', lang: 'en-US', voiceURI: 'en-US-DavisNeural' },
  { name: 'Sonia (Female)', lang: 'en-GB', voiceURI: 'en-GB-SoniaNeural' },
  { name: 'Ryan (Male)', lang: 'en-GB', voiceURI: 'en-GB-RyanNeural' },
  // 日语
  { name: '七海 (女声)', lang: 'ja-JP', voiceURI: 'ja-JP-NanamiNeural' },
  { name: '圭太 (男声)', lang: 'ja-JP', voiceURI: 'ja-JP-KeitaNeural' },
  // 韩语
  { name: '선히 (Female)', lang: 'ko-KR', voiceURI: 'ko-KR-SunHiNeural' },
  { name: '인준 (Male)', lang: 'ko-KR', voiceURI: 'ko-KR-InJoonNeural' },
  // 法语
  { name: 'Denise (Female)', lang: 'fr-FR', voiceURI: 'fr-FR-DeniseNeural' },
  { name: 'Henri (Male)', lang: 'fr-FR', voiceURI: 'fr-FR-HenriNeural' },
  // 德语
  { name: 'Katja (Female)', lang: 'de-DE', voiceURI: 'de-DE-KatjaNeural' },
  { name: 'Conrad (Male)', lang: 'de-DE', voiceURI: 'de-DE-ConradNeural' },
  // 西班牙语
  { name: 'Elvira (Female)', lang: 'es-ES', voiceURI: 'es-ES-ElviraNeural' },
  { name: 'Alvaro (Male)', lang: 'es-ES', voiceURI: 'es-ES-AlvaroNeural' },
  // 意大利语
  { name: 'Elsa (Female)', lang: 'it-IT', voiceURI: 'it-IT-ElsaNeural' },
  { name: 'Diego (Male)', lang: 'it-IT', voiceURI: 'it-IT-DiegoNeural' },
  // 俄语
  { name: 'Svetlana (Female)', lang: 'ru-RU', voiceURI: 'ru-RU-SvetlanaNeural' },
  { name: 'Dmitry (Male)', lang: 'ru-RU', voiceURI: 'ru-RU-DmitryNeural' },
  // 葡萄牙语
  { name: 'Francisca (Female)', lang: 'pt-BR', voiceURI: 'pt-BR-FranciscaNeural' },
  { name: 'Antonio (Male)', lang: 'pt-BR', voiceURI: 'pt-BR-AntonioNeural' },
]

/** 从语音名称推断性别 */
function detectVoiceGender(voice: TTSVoice): 'female' | 'male' | null {
  if (/(女声|女|Female)/i.test(voice.name)) return 'female'
  if (/(男声|男|Male)/i.test(voice.name)) return 'male'
  return null
}

/**
 * 创建 TTS 服务实例
 * 通过 /api/aichat/tts（edge-tts）合成语音，客户端用 HTMLAudioElement 播放
 */
export function createTTSService(): TTSService {
  let audio: HTMLAudioElement | null = null
  let objectUrl: string | null = null
  let abortController: AbortController | null = null
  let currentOnEnd: (() => void) | null = null
  let currentResolve: (() => void) | null = null
  let speaking = false

  /** 释放音频资源（不触发 onEnd，不 resolve Promise） */
  function cleanup(): void {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
    if (audio) {
      audio.onplay = null
      audio.onended = null
      audio.onerror = null
      audio.src = ''
      audio = null
    }
    speaking = false
  }

  /** 停止当前播放：释放资源 + 触发 onEnd + resolve speak() 的 Promise */
  function stopCurrent(): void {
    const onEnd = currentOnEnd
    const resolve = currentResolve
    cleanup()
    currentOnEnd = null
    currentResolve = null
    onEnd?.()
    resolve?.()
  }

  return {
    /**
     * 播放语音
     * POST /api/aichat/tts → MP3 blob → Audio.play()
     */
    speak: async (options: TTSOptions): Promise<void> => {
      // 停止当前播放（若有）
      stopCurrent()

      speaking = true
      abortController = new AbortController()
      currentOnEnd = options.onEnd || null

      try {
        const resp = await fetch('/api/aichat/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: options.text,
            voice: options.voice?.voiceURI,
            rate: options.rate,
            pitch: options.pitch,
            volume: options.volume,
            lang: options.lang,
            // 显式选了 voice 时不传 gender（让 voice 优先）
            gender: options.voice ? undefined : options.gender,
          }),
          signal: abortController.signal,
        })

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.msg || `TTS 请求失败: ${resp.status}`)
        }

        const blob = await resp.blob()

        // stop() 在 fetch 期间被调用 → abortController 已被 cleanup 置空，静默返回
        if (!abortController) return

        objectUrl = URL.createObjectURL(blob)
        audio = new Audio(objectUrl)

        return new Promise<void>((resolve, reject) => {
          currentResolve = resolve

          audio!.onplay = () => options.onStart?.()
          audio!.onended = () => {
            currentOnEnd = null
            currentResolve = null
            cleanup()
            options.onEnd?.()
            resolve()
          }
          audio!.onerror = () => {
            currentOnEnd = null
            currentResolve = null
            cleanup()
            options.onEnd?.()
            reject(new Error('音频播放失败'))
          }
          audio!.play().catch((e) => {
            currentOnEnd = null
            currentResolve = null
            cleanup()
            options.onEnd?.()
            reject(e)
          })
        })
      } catch (e: any) {
        // stop() 导致的 AbortError → 已由 stopCurrent 处理，静默返回
        if (e.name === 'AbortError' || !abortController) return
        currentOnEnd = null
        currentResolve = null
        cleanup()
        options.onEnd?.()
        throw e
      }
    },

    /**
     * 停止播放
     */
    stop: () => {
      stopCurrent()
    },

    /**
     * 暂停播放
     */
    pause: () => {
      if (audio && !audio.paused) {
        audio.pause()
      }
    },

    /**
     * 恢复播放
     */
    resume: () => {
      if (audio && audio.paused) {
        audio.play().catch(() => {})
      }
    },

    /**
     * 获取所有可用的语音
     */
    getVoices: (): TTSVoice[] => {
      return EDGE_TTS_VOICES
    },

    /**
     * 根据语言获取语音列表（可选按性别筛选，无匹配时回退到未筛选列表）
     */
    getVoicesByLanguage: (lang: string, gender?: 'female' | 'male'): TTSVoice[] => {
      const langVoices = EDGE_TTS_VOICES.filter(voice =>
        voice.lang.toLowerCase().startsWith(lang.toLowerCase())
      )
      if (!gender) return langVoices
      const matched = langVoices.filter(v => detectVoiceGender(v) === gender)
      return matched.length > 0 ? matched : langVoices
    },

    /**
     * 检测是否支持 TTS（需要浏览器 Audio 构造器播放服务端合成的 MP3）
     */
    isSupported: (): boolean => {
      return typeof window !== 'undefined' && typeof window.Audio !== 'undefined'
    },

    /**
     * 检查是否正在播放
     */
    isSpeaking: (): boolean => {
      return speaking
    },

    /**
     * 检查是否暂停
     */
    isPaused: (): boolean => {
      return !!audio && audio.paused && speaking
    }
  }
}

/**
 * 语言代码映射表
 */
export const languageMap: Record<string, string> = {
  'zh-CN': '中文（简体）',
  'zh-TW': '中文（繁体）',
  'en-US': '英语（美国）',
  'en-GB': '英语（英国）',
  'ja-JP': '日语',
  'ko-KR': '韩语',
  'fr-FR': '法语',
  'de-DE': '德语',
  'es-ES': '西班牙语',
  'it-IT': '意大利语',
  'ru-RU': '俄语',
  'pt-BR': '葡萄牙语（巴西）',
  'ar-SA': '阿拉伯语',
  'hi-IN': '印地语',
  'th-TH': '泰语',
  'vi-VN': '越南语',
  'nl-NL': '荷兰语',
  'pl-PL': '波兰语',
  'tr-TR': '土耳其语'
}

/**
 * ASR (Automatic Speech Recognition) 工具函数
 * 使用浏览器 Web Speech API 实现
 */

export interface ASROptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export interface ASRService {
  start: (options?: ASROptions) => Promise<void>
  stop: () => void
  abort: () => void
  isSupported: () => boolean
  isListening: () => boolean
}

/**
 * 创建 ASR 服务实例
 */
export function createASRService(): ASRService {
  let recognition: any = null
  let isListeningFlag = false

  // 获取 SpeechRecognition 构造函数（兼容不同浏览器前缀）
  const getSpeechRecognition = (): any | null => {
    if (!import.meta.client) return null

    return (window as any).SpeechRecognition ||
           (window as any).webkitSpeechRecognition ||
           null
  }

  return {
    /**
     * 开始语音识别
     */
    start: async (options: ASROptions = {}): Promise<void> => {
      return new Promise((resolve, reject) => {
        const SpeechRecognitionClass = getSpeechRecognition()
        if (!SpeechRecognitionClass) {
          reject(new Error('当前浏览器不支持语音识别'))
          return
        }

        // 停止之前的识别
        if (recognition) {
          recognition.abort()
        }

        recognition = new SpeechRecognitionClass()

        // 设置识别参数
        if (options.lang) recognition.lang = options.lang
        if (options.continuous !== undefined) recognition.continuous = options.continuous
        if (options.interimResults !== undefined) recognition.interimResults = options.interimResults
        if (options.maxAlternatives !== undefined) recognition.maxAlternatives = options.maxAlternatives

        recognition.onstart = () => {
          isListeningFlag = true
          resolve()
        }

        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          const result = finalTranscript || interimTranscript
          const isFinal = finalTranscript.length > 0

          if (options.onResult && result) {
            options.onResult(result, isFinal)
          }
        }

        recognition.onerror = (event: any) => {
          isListeningFlag = false
          if (options.onError) {
            options.onError(event.error)
          }
          reject(new Error(`语音识别错误: ${event.error}`))
        }

        recognition.onend = () => {
          isListeningFlag = false
          if (options.onEnd) {
            options.onEnd()
          }
        }

        recognition.start()
      })
    },

    /**
     * 停止语音识别（等待当前识别完成）
     */
    stop: () => {
      if (recognition) {
        recognition.stop()
        isListeningFlag = false
      }
    },

    /**
     * 中止语音识别（立即停止）
     */
    abort: () => {
      if (recognition) {
        recognition.abort()
        isListeningFlag = false
      }
    },

    /**
     * 检查是否支持 ASR
     */
    isSupported: (): boolean => {
      return getSpeechRecognition() !== null
    },

    /**
     * 检查是否正在识别
     */
    isListening: (): boolean => {
      return isListeningFlag
    }
  }
}

/**
 * LLM (Large Language Model) 服务
 * 基于 WebLLM 在浏览器内通过 WebGPU 运行，无需后端
 *
 * 设计要点：
 * - engine 实例刻意保留为模块级普通变量，绝不进入 Vue 响应式代理
 * - 通过 subscribeLLMState 让组件订阅状态变化，保持 UI 与引擎解耦
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMState {
  ready: boolean
  loading: boolean
  progress: number
  loadedBytes: string
  totalBytes: string
  error: string
  supported: boolean | null
}

type LLMStateListener = (state: LLMState) => void

// ✅ 模块级单例：引擎与模块均不进入响应式系统
let webllmModule: any = null
let engine: any = null

let llmState: LLMState = {
  ready: false,
  loading: false,
  progress: 0,
  loadedBytes: '0 MB',
  totalBytes: '',
  error: '',
  supported: null,
}

const llmStateListeners = new Set<LLMStateListener>()

function setLLMState(updates: Partial<LLMState>): void {
  llmState = { ...llmState, ...updates }
  llmStateListeners.forEach((l) => l(llmState))
}

/** 订阅 LLM 状态变化，立即触发一次当前状态。返回取消订阅函数。 */
export function subscribeLLMState(listener: LLMStateListener): () => void {
  llmStateListeners.add(listener)
  listener(llmState)
  return () => { llmStateListeners.delete(listener) }
}

/** 获取当前 LLM 状态快照 */
export function getLLMState(): LLMState {
  return llmState
}

/** 默认模型（体积小、加载快，适合演示） */
export const DEFAULT_LLM_MODEL = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

/** 默认模式：api（服务端 API） / local（浏览器本地 WebLLM） */
export const DEFAULT_LLM_MODE = 'api' as const;

/** 可用的本地模型列表（供 UI 选择，llm.client.vue 与 aichat/edit.vue 共用） */
export const LOCAL_LLM_MODELS: Array<{ label: string; value: string }> = [
  {
    label: "Qwen2.5-0.5B (~300MB)",
    value: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", 
  },
  {
    label: "TinyLlama 1.1B (~644MB)",
    value: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",
  },
];

function formatBytesLLM(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 加载 WebLLM 库（CDN 动态 import）。
 *
 * 不走 npm 包 import('@mlc-ai/web-llm')，因为该包体积 6MB+，
 * Vite 依赖优化器会触发 "Maximum call stack size exceeded"。
 * 用 CDN URL 配合 vite-ignore 注释让 Vite 完全跳过解析，
 * 浏览器运行时直接从 CDN 加载 JS+WASM 推理引擎。
 *
 * 模型权重走云端 HuggingFace（WebLLM 默认 prebuiltAppConfig）。
 *
 * 仅在客户端调用；SSR 不会触发此函数。
 */
const WEBLLM_CDN_PRIMARY = 'https://esm.sh/@mlc-ai/web-llm@0.2.84'
const WEBLLM_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm'

async function loadWebLLMModule(): Promise<any> {
  if (webllmModule) return webllmModule
  try {
    webllmModule = await import(/* @vite-ignore */ WEBLLM_CDN_PRIMARY)
  } catch {
    webllmModule = await import(/* @vite-ignore */ WEBLLM_CDN_FALLBACK)
  }
  return webllmModule
}

/** 检测 WebGPU 是否可用，结果写入 state.supported */
export async function checkWebGPU(): Promise<boolean> {
  if (!import.meta.client || !(navigator as any).gpu) {
    setLLMState({ supported: false })
    return false
  }
  try {
    const adapter = await (navigator as any).gpu.requestAdapter()
    const ok = !!adapter
    setLLMState({ supported: ok })
    return ok
  } catch {
    setLLMState({ supported: false })
    return false
  }
}

// 进度回调节流（按帧合并，避免高频更新卡顿）
let progressRafId: number | null = null
let pendingProgress: any = null

function updateProgress(progress: any): void {
  pendingProgress = progress
  if (progressRafId !== null) return
  if (!import.meta.client) return
  progressRafId = requestAnimationFrame(() => {
    if (pendingProgress) {
      setLLMState({
        progress: Math.round(pendingProgress.progress * 100),
        loadedBytes: formatBytesLLM(pendingProgress.loaded || 0),
        totalBytes: pendingProgress.text || '',
      })
    }
    progressRafId = null
  })
}

/**
 * 加载模型（若已加载则跳过）。仅在客户端执行。
 * @param model 模型 ID，默认 DEFAULT_LLM_MODEL
 */
export async function loadLLM(model: string = DEFAULT_LLM_MODEL): Promise<void> {
  if (llmState.loading || llmState.ready) return
  if (!import.meta.client) return

  setLLMState({ loading: true, error: '', progress: 0 })

  const gpuOk = await checkWebGPU()
  if (!gpuOk) {
    setLLMState({
      loading: false,
      error: 'WebGPU is not supported. Please use Chrome 113+ or Edge 113+.',
    })
    throw new Error('WebGPU not supported')
  }

  try {
    const webllm = await loadWebLLMModule()
    engine = await webllm.CreateMLCEngine(model, {
      initProgressCallback: updateProgress,
    })
    setLLMState({ ready: true, loading: false })
  } catch (e: any) {
    setLLMState({ loading: false, error: e?.message || String(e) })
    throw e
  }
}

/** 卸载模型，释放显存 */
export async function unloadLLM(): Promise<void> {
  if (progressRafId !== null) {
    if (import.meta.client) cancelAnimationFrame(progressRafId)
    progressRafId = null
  }
  if (engine) {
    try {
      await engine.unload()
    } catch { /* ignore */ }
    engine = null
    setLLMState({ ready: false, progress: 0 })
  }
}

/**
 * 流式对话：传入消息列表，通过回调推送增量文本，返回完整响应。
 *
 * @param messages 对话消息（含 system / user / assistant）
 * @param onChunk  每收到一段文本时触发
 * @returns 完整响应文本
 */
export async function chatLLM(
  messages: LLMMessage[],
  onChunk?: (content: string, reasoning?: string) => void,
): Promise<string> {
  if (!engine) {
    throw new Error('Engine not loaded. Call loadLLM() first.')
  }

  // ✅ map 产生全新普通对象（字段为字符串基本量），已脱离响应式代理
  const rawMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  const completion = await engine.chat.completions.create({
    messages: rawMessages,
    stream: true,
  })

  let full = ''
  for await (const chunk of completion) {
    const delta = chunk.choices?.[0]?.delta?.content || ''
    if (delta) {
      full += delta
      onChunk?.(delta)
    }
  }
  return full
}

/** 清理资源（组件卸载时调用） */
export function disposeLLM(): void {
  if (progressRafId !== null) {
    if (import.meta.client) cancelAnimationFrame(progressRafId)
    progressRafId = null
  }
  if (engine) {
    engine.unload().catch(() => {})
    engine = null
    setLLMState({ ready: false })
  }
}