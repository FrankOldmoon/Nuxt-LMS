/**
 * useAsr — Speech recognition composable
 *
 * Wraps the browser Web Speech API's recognition start/stop, result accumulation, and error handling.
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
      'no-speech': 'No speech detected',
      'aborted': 'Recognition aborted',
      'audio-capture': 'Unable to capture audio',
      'network': 'Network error',
      'not-allowed': 'Microphone permission denied',
      'service-not-allowed': 'Speech recognition service unavailable',
      'bad-grammar': 'Grammar error',
      'language-not-supported': 'Language not supported'
    }
    return errorMessages[error] || `Recognition error: ${error}`
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
        error.value = e.message || 'Failed to start speech recognition'
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

    try {
      await navigator.clipboard.writeText(finalTranscript.value)
      // Optional: show copy success notification
    } catch (e) {
      error.value = 'Copy failed'
    }
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
