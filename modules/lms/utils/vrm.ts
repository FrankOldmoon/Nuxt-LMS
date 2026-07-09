/**
 * VRM 数字人语音状态单例
 *
 * 解耦 chatbox（产生流式文本）与 VRM 组件（消费文本驱动口型同步）。
 * 参考 ai.ts 中 subscribeLLMState 的模块级单例模式：
 * - 状态为模块级普通变量，不进入 Vue 响应式系统
 * - 通过 subscribeVrmSpeech 让组件订阅状态变化
 */

export interface VrmSpeechState {
  /** 当前是否在"说话"（有待消费的文本，由 LLM 流式文本驱动，用于手势） */
  isSpeaking: boolean
  /** 尚未消费的文本（VRM 动画循环按速率消费） */
  pendingText: string
  /** TTS 音频正在播放（驱动口型同步，与文本流分离） */
  audioSpeaking: boolean
  /** TTS 正在朗读的文本（按速率消费驱动唇形） */
  audioText: string
}

type VrmSpeechListener = (state: VrmSpeechState) => void

// ✅ 模块级单例：不进入响应式系统
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
 * 喂入一段流式文本。
 * 若之前已结束说话（isSpeaking=false），自动清空旧文本重新开始；
 * 若仍在说话，直接追加到 pendingText 末尾。
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
 * 消费 n 个字符，返回被消费的文本。
 * pendingText 耗尽时自动置 isSpeaking=false。
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

/** 清空所有待说话文本并停止（仅文本流通道，不影响音频口型） */
export function clearVrmSpeech(): void {
  if (!vrmSpeechState.isSpeaking && !vrmSpeechState.pendingText) return
  vrmSpeechState = {
    ...vrmSpeechState,
    isSpeaking: false,
    pendingText: '',
  }
  notify()
}

// ===================== TTS 音频通道（驱动口型同步） =====================
// 口型只跟随真实播放的语音，与 LLM 文本流解耦：避免文本流提前驱动嘴型。

/** TTS 开始朗读：设置音频文本，驱动口型同步（重置之前的音频文本） */
export function feedVrmAudio(text: string): void {
  if (!text) return
  vrmSpeechState = {
    ...vrmSpeechState,
    audioSpeaking: true,
    audioText: text,
  }
  notify()
}

/** 消费 n 个音频文本字符用于唇形同步 */
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

/** TTS 结束朗读：停止口型同步 */
export function clearVrmAudio(): void {
  if (!vrmSpeechState.audioSpeaking && !vrmSpeechState.audioText) return
  vrmSpeechState = {
    ...vrmSpeechState,
    audioSpeaking: false,
    audioText: '',
  }
  notify()
}

/** 订阅状态变化，立即触发一次当前状态。返回取消订阅函数。 */
export function subscribeVrmSpeech(listener: VrmSpeechListener): () => void {
  listeners.add(listener)
  listener(vrmSpeechState)
  return () => { listeners.delete(listener) }
}

/** 获取当前状态快照 */
export function getVrmSpeechState(): VrmSpeechState {
  return vrmSpeechState
}
