/**
 * useAsr — 语音识别组合式函数
 *
 * 封装浏览器 Web Speech API 的识别启停、结果累积与错误处理。
 */
import { createASRService, languageMap } from '../utils/ai'

export function useAsr() {
  const asrService = createASRService()

  const selectedLang = ref('zh-CN')
  const continuous = ref(false)
  const interimResults = ref(true)
  const isListening = ref(false)
  const finalTranscript = ref('')
  const interimTranscript = ref('')
  const error = ref('')

  const isSupported = asrService.isSupported()

  const getErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      'no-speech': '未检测到语音',
      'aborted': '识别被中止',
      'audio-capture': '无法捕获音频',
      'network': '网络错误',
      'not-allowed': '麦克风权限被拒绝',
      'service-not-allowed': '语音识别服务不可用',
      'bad-grammar': '语法错误',
      'language-not-supported': '不支持的语言'
    }
    return errorMessages[error] || `识别错误: ${error}`
  }

  const handleToggle = async () => {
    if (isListening.value) {
      asrService.stop()
      isListening.value = false
      interimTranscript.value = ''
    } else {
      error.value = ''
      finalTranscript.value = ''
      interimTranscript.value = ''

      try {
        await asrService.start({
          lang: selectedLang.value,
          continuous: continuous.value,
          interimResults: interimResults.value,
          onResult: (transcript, isFinal) => {
            if (isFinal) {
              finalTranscript.value += transcript
              interimTranscript.value = ''
            } else {
              interimTranscript.value = transcript
            }
          },
          onError: (errorMsg) => {
            error.value = getErrorMessage(errorMsg)
            isListening.value = false
          },
          onEnd: () => {
            isListening.value = false
            interimTranscript.value = ''
          }
        })

        isListening.value = true
      } catch (e: any) {
        error.value = e.message || '语音识别启动失败'
        isListening.value = false
      }
    }
  }

  const handleClear = () => {
    finalTranscript.value = ''
    interimTranscript.value = ''
  }

  const handleCopy = async () => {
    if (!finalTranscript.value) return

    const text = finalTranscript.value
    let ok = false
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch {
        // 非安全上下文（非 HTTPS）或权限不足，降级到 execCommand
      }
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }
    if (!ok) error.value = '复制失败'
  }

  return {
    selectedLang,
    continuous,
    interimResults,
    isListening,
    finalTranscript,
    interimTranscript,
    error,
    isSupported,
    handleToggle,
    handleClear,
    handleCopy,
    languageMap,
  }
}
