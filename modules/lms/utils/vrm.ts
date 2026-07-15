/**
 * VRM digital human speech state singleton
 *
 * Decouples chatbox (produces streaming text) from the VRM component (consumes text to drive lip-sync).
 * Follows the module-level singleton pattern from ai.ts's subscribeLLMState:
 * - State is a module-level plain variable, not part of the Vue reactive system
 * - Components subscribe to state changes via subscribeVrmSpeech
 */

export interface VrmSpeechState {
  /** Whether currently "speaking" (has text to consume, driven by LLM streaming text, used for gestures) */
  isSpeaking: boolean
  /** Text not yet consumed (consumed by the VRM animation loop at a given rate) */
  pendingText: string
  /** TTS audio is playing (drives lip-sync, decoupled from the text stream) */
  audioSpeaking: boolean
  /** Text currently being read by TTS (consumed at a given rate to drive lip shapes) */
  audioText: string
}

type VrmSpeechListener = (state: VrmSpeechState) => void

// ✅ Module-level singleton: not part of the reactive system
let vrmSpeechState: VrmSpeechState = {
  isSpeaking: false,
  pendingText: '',
  audioSpeaking: false,
  audioText: '',
}

const listeners = new Set<VrmSpeechListener>()

function notify(): void {
  listeners.forEach((l) => l(vrmSpeechState))
}

/**
 * Feed a chunk of streaming text.
 * If speaking has already ended (isSpeaking=false), automatically clears old text and restarts;
 * if still speaking, appends directly to the end of pendingText.
 */
export function feedVrmText(text: string): void {
  if (!text) return
  const wasSpeaking = vrmSpeechState.isSpeaking
  vrmSpeechState = {
    ...vrmSpeechState,
    isSpeaking: true,
    pendingText: wasSpeaking ? vrmSpeechState.pendingText + text : text,
  }
  notify()
}

/**
 * Consume n characters, returning the consumed text.
 * When pendingText is exhausted, automatically sets isSpeaking=false.
 */
export function consumeVrmChars(n: number): string {
  if (n <= 0 || !vrmSpeechState.pendingText) return ''
  const consumed = vrmSpeechState.pendingText.slice(0, n)
  const remaining = vrmSpeechState.pendingText.slice(n)
  vrmSpeechState = {
    ...vrmSpeechState,
    isSpeaking: remaining.length > 0,
    pendingText: remaining,
  }
  notify()
  return consumed
}

/** Clear all pending speech text and stop (text stream channel only, does not affect audio lip-sync) */
export function clearVrmSpeech(): void {
  if (!vrmSpeechState.isSpeaking && !vrmSpeechState.pendingText) return
  vrmSpeechState = {
    ...vrmSpeechState,
    isSpeaking: false,
    pendingText: '',
  }
  notify()
}

// ===================== TTS audio channel (drives lip-sync) =====================
// Lip movement only follows the actually playing audio, decoupled from the LLM text stream: prevents the text stream from driving lip shapes prematurely.

/** TTS starts reading: sets audio text to drive lip-sync (resets previous audio text) */
export function feedVrmAudio(text: string): void {
  if (!text) return
  vrmSpeechState = {
    ...vrmSpeechState,
    audioSpeaking: true,
    audioText: text,
  }
  notify()
}

/** Consume n audio text characters for lip-sync */
export function consumeVrmAudioChars(n: number): string {
  if (n <= 0 || !vrmSpeechState.audioText) return ''
  const consumed = vrmSpeechState.audioText.slice(0, n)
  const remaining = vrmSpeechState.audioText.slice(n)
  vrmSpeechState = {
    ...vrmSpeechState,
    audioText: remaining,
  }
  notify()
  return consumed
}

/** TTS finishes reading: stop lip-sync */
export function clearVrmAudio(): void {
  if (!vrmSpeechState.audioSpeaking && !vrmSpeechState.audioText) return
  vrmSpeechState = {
    ...vrmSpeechState,
    audioSpeaking: false,
    audioText: '',
  }
  notify()
}

/** Subscribe to state changes, immediately triggers once with the current state. Returns an unsubscribe function. */
export function subscribeVrmSpeech(listener: VrmSpeechListener): () => void {
  listeners.add(listener)
  listener(vrmSpeechState)
  return () => { listeners.delete(listener) }
}

/** Get the current state snapshot */
export function getVrmSpeechState(): VrmSpeechState {
  return vrmSpeechState
}
