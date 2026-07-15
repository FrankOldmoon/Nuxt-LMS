/**
 * TTS (Text-to-Speech) utility functions
 * Synthesize speech via the server-side edge-tts API, play on the client with HTMLAudioElement
 *
 * Data flow: speak(text) → POST /api/aichat/tts → MP3 blob → Audio.play()
 */

/** Voice object (compatible with the browser SpeechSynthesisVoice interface shape; voiceURI stores the edge-tts voice name) */
export interface TTSVoice {
  name: string
  lang: string
  voiceURI: string
  default?: boolean
}

/** Backward-compatible import: tts.vue uses import type { SpeechSynthesisVoice } from ai */
export type SpeechSynthesisVoice = TTSVoice

export interface TTSOptions {
  text: string
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voice?: TTSVoice
  /** Voice gender filter (only effective when voice is not provided) */
  gender?: 'female' | 'male'
  /** Triggered when voice playback starts (used to drive lip-sync, etc.) */
  onStart?: () => void
  /** Triggered when voice playback ends (normal end or cancelled/error) */
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
 * Common edge-tts voice list (grouped by language, including male and female voices)
 * voiceURI is the edge-tts voice name, sent as the voice parameter to /api/aichat/tts
 */
const EDGE_TTS_VOICES: TTSVoice[] = [
  // Chinese
  { name: 'Xiaoxiao (Female)', lang: 'zh-CN', voiceURI: 'zh-CN-XiaoxiaoNeural' },
  { name: 'Yunxi (Male)', lang: 'zh-CN', voiceURI: 'zh-CN-YunxiNeural' },
  { name: 'Xiaoyi (Female)', lang: 'zh-CN', voiceURI: 'zh-CN-XiaoyiNeural' },
  { name: 'Yunyang (Male)', lang: 'zh-CN', voiceURI: 'zh-CN-YunyangNeural' },
  { name: 'HsiaoChen (Female)', lang: 'zh-TW', voiceURI: 'zh-TW-HsiaoChenNeural' },
  { name: 'YunJui (Male)', lang: 'zh-TW', voiceURI: 'zh-TW-YunJuiNeural' },
  // English
  { name: 'Emma (Female)', lang: 'en-US', voiceURI: 'en-US-EmmaMultilingualNeural' },
  { name: 'Jenny (Female)', lang: 'en-US', voiceURI: 'en-US-JennyNeural' },
  { name: 'Guy (Male)', lang: 'en-US', voiceURI: 'en-US-GuyNeural' },
  { name: 'Davis (Male)', lang: 'en-US', voiceURI: 'en-US-DavisNeural' },
  { name: 'Sonia (Female)', lang: 'en-GB', voiceURI: 'en-GB-SoniaNeural' },
  { name: 'Ryan (Male)', lang: 'en-GB', voiceURI: 'en-GB-RyanNeural' },
  // Japanese
  { name: 'Nanami (Female)', lang: 'ja-JP', voiceURI: 'ja-JP-NanamiNeural' },
  { name: 'Keita (Male)', lang: 'ja-JP', voiceURI: 'ja-JP-KeitaNeural' },
  // Korean
  { name: 'SunHi (Female)', lang: 'ko-KR', voiceURI: 'ko-KR-SunHiNeural' },
  { name: 'InJoon (Male)', lang: 'ko-KR', voiceURI: 'ko-KR-InJoonNeural' },
  // French
  { name: 'Denise (Female)', lang: 'fr-FR', voiceURI: 'fr-FR-DeniseNeural' },
  { name: 'Henri (Male)', lang: 'fr-FR', voiceURI: 'fr-FR-HenriNeural' },
  // German
  { name: 'Katja (Female)', lang: 'de-DE', voiceURI: 'de-DE-KatjaNeural' },
  { name: 'Conrad (Male)', lang: 'de-DE', voiceURI: 'de-DE-ConradNeural' },
  // Spanish
  { name: 'Elvira (Female)', lang: 'es-ES', voiceURI: 'es-ES-ElviraNeural' },
  { name: 'Alvaro (Male)', lang: 'es-ES', voiceURI: 'es-ES-AlvaroNeural' },
  // Italian
  { name: 'Elsa (Female)', lang: 'it-IT', voiceURI: 'it-IT-ElsaNeural' },
  { name: 'Diego (Male)', lang: 'it-IT', voiceURI: 'it-IT-DiegoNeural' },
  // Russian
  { name: 'Svetlana (Female)', lang: 'ru-RU', voiceURI: 'ru-RU-SvetlanaNeural' },
  { name: 'Dmitry (Male)', lang: 'ru-RU', voiceURI: 'ru-RU-DmitryNeural' },
  // Portuguese
  { name: 'Francisca (Female)', lang: 'pt-BR', voiceURI: 'pt-BR-FranciscaNeural' },
  { name: 'Antonio (Male)', lang: 'pt-BR', voiceURI: 'pt-BR-AntonioNeural' },
]

/** Infer gender from voice name */
function detectVoiceGender(voice: TTSVoice): 'female' | 'male' | null {
  if (/(\u5973\u58f0|\u5973|Female)/i.test(voice.name)) return 'female'
  if (/(\u7537\u58f0|\u7537|Male)/i.test(voice.name)) return 'male'
  return null
}

/**
 * Create a TTS service instance
 * Synthesize speech via /api/aichat/tts (edge-tts), play on the client with HTMLAudioElement
 */
export function createTTSService(): TTSService {
  let audio: HTMLAudioElement | null = null
  let objectUrl: string | null = null
  let abortController: AbortController | null = null
  let currentOnEnd: (() => void) | null = null
  let currentResolve: (() => void) | null = null
  let speaking = false

  /** Release audio resources (does not trigger onEnd, does not resolve Promise) */
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

  /** Stop current playback: release resources + trigger onEnd + resolve speak()'s Promise */
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
     * Play speech
     * POST /api/aichat/tts → MP3 blob → Audio.play()
     */
    speak: async (options: TTSOptions): Promise<void> => {
      // Stop current playback (if any)
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
            // When voice is explicitly selected, do not send gender (let voice take priority)
            gender: options.voice ? undefined : options.gender,
          }),
          signal: abortController.signal,
        })

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.msg || `TTS request failed: ${resp.status}`)
        }

        const blob = await resp.blob()

        // stop() was called during fetch → abortController has been cleared by cleanup, return silently
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
            reject(new Error('Audio playback failed'))
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
        // AbortError caused by stop() → already handled by stopCurrent, return silently
        if (e.name === 'AbortError' || !abortController) return
        currentOnEnd = null
        currentResolve = null
        cleanup()
        options.onEnd?.()
        throw e
      }
    },

    /**
     * Stop playback
     */
    stop: () => {
      stopCurrent()
    },

    /**
     * Pause playback
     */
    pause: () => {
      if (audio && !audio.paused) {
        audio.pause()
      }
    },

    /**
     * Resume playback
     */
    resume: () => {
      if (audio && audio.paused) {
        audio.play().catch(() => {})
      }
    },

    /**
     * Get all available voices
     */
    getVoices: (): TTSVoice[] => {
      return EDGE_TTS_VOICES
    },

    /**
     * Get voice list by language (optionally filter by gender; falls back to unfiltered list if no match)
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
     * Check whether TTS is supported (requires browser Audio constructor to play server-synthesized MP3)
     */
    isSupported: (): boolean => {
      return typeof window !== 'undefined' && typeof window.Audio !== 'undefined'
    },

    /**
     * Check whether currently playing
     */
    isSpeaking: (): boolean => {
      return speaking
    },

    /**
     * Check whether paused
     */
    isPaused: (): boolean => {
      return !!audio && audio.paused && speaking
    }
  }
}

/**
 * Language code mapping table
 */
export const languageMap: Record<string, string> = {
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'fr-FR': 'French',
  'de-DE': 'German',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'ru-RU': 'Russian',
  'pt-BR': 'Portuguese (Brazil)',
  'ar-SA': 'Arabic',
  'hi-IN': 'Hindi',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'tr-TR': 'Turkish'
}

/**
 * ASR (Automatic Speech Recognition) utility functions
 * Implemented using the browser Web Speech API
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
 * Create an ASR service instance
 */
export function createASRService(): ASRService {
  let recognition: any = null
  let isListeningFlag = false

  // Get the SpeechRecognition constructor (compatible with different browser prefixes)
  const getSpeechRecognition = (): any | null => {
    if (!import.meta.client) return null

    return (window as any).SpeechRecognition ||
           (window as any).webkitSpeechRecognition ||
           null
  }

  return {
    /**
     * Start speech recognition
     */
    start: async (options: ASROptions = {}): Promise<void> => {
      return new Promise((resolve, reject) => {
        const SpeechRecognitionClass = getSpeechRecognition()
        if (!SpeechRecognitionClass) {
          reject(new Error('Current browser does not support speech recognition'))
          return
        }

        // Stop previous recognition
        if (recognition) {
          recognition.abort()
        }

        recognition = new SpeechRecognitionClass()

        // Set recognition parameters
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
          reject(new Error(`Speech recognition error: ${event.error}`))
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
     * Stop speech recognition (wait for current recognition to complete)
     */
    stop: () => {
      if (recognition) {
        recognition.stop()
        isListeningFlag = false
      }
    },

    /**
     * Abort speech recognition (stop immediately)
     */
    abort: () => {
      if (recognition) {
        recognition.abort()
        isListeningFlag = false
      }
    },

    /**
     * Check whether ASR is supported
     */
    isSupported: (): boolean => {
      return getSpeechRecognition() !== null
    },

    /**
     * Check whether currently listening
     */
    isListening: (): boolean => {
      return isListeningFlag
    }
  }
}

/**
 * LLM (Large Language Model) service
 * Runs in-browser via WebLLM using WebGPU, no backend required
 *
 * Design notes:
 * - The engine instance is deliberately kept as a module-level plain variable, never entering the Vue reactive proxy
 * - Components subscribe to state changes via subscribeLLMState, keeping UI decoupled from the engine
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

// ✅ Module-level singleton: engine and module do not enter the reactive system
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

/** Subscribe to LLM state changes, immediately triggers once with the current state. Returns an unsubscribe function. */
export function subscribeLLMState(listener: LLMStateListener): () => void {
  llmStateListeners.add(listener)
  listener(llmState)
  return () => { llmStateListeners.delete(listener) }
}

/** Get the current LLM state snapshot */
export function getLLMState(): LLMState {
  return llmState
}

/** Default model (small size, fast loading, suitable for demo) */
export const DEFAULT_LLM_MODEL = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

/** Default mode: api (server-side API) / local (browser-side WebLLM) */
export const DEFAULT_LLM_MODE = 'api' as const;

/** Available local model list (for UI selection, shared by llm.client.vue and aichat/edit.vue) */
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
 * Load the WebLLM library (CDN dynamic import).
 *
 * Does not use the npm package import('@mlc-ai/web-llm'), because that package is 6MB+,
 * and Vite's dependency optimizer triggers "Maximum call stack size exceeded".
 * Uses a CDN URL with the vite-ignore comment to make Vite completely skip parsing;
 * the browser loads the JS+WASM inference engine directly from the CDN at runtime.
 *
 * Model weights are served from HuggingFace cloud (WebLLM's default prebuiltAppConfig).
 *
 * Only called on the client; SSR does not trigger this function.
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

/** Check whether WebGPU is available, write the result to state.supported */
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

// Progress callback throttling (merged per frame, to avoid lag from high-frequency updates)
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
 * Load the model (skipped if already loaded). Only executes on the client.
 * @param model Model ID, defaults to DEFAULT_LLM_MODEL
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

/** Unload the model, release GPU memory */
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
 * Streaming chat: pass in a message list, push incremental text via callback, return the full response.
 *
 * @param messages Conversation messages (including system / user / assistant)
 * @param onChunk  Triggered each time a chunk of text is received
 * @returns Full response text
 */
export async function chatLLM(
  messages: LLMMessage[],
  onChunk?: (content: string, reasoning?: string) => void,
): Promise<string> {
  if (!engine) {
    throw new Error('Engine not loaded. Call loadLLM() first.')
  }

  // ✅ map produces brand-new plain objects (with string primitive fields), detached from the reactive proxy
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

/** Clean up resources (called when the component is unmounted) */
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
