/**
 * useTts — 文本转语音组合式函数
 *
 * 封装 edge-tts 服务的播放/暂停/停止逻辑与语音列表筛选。
 * 语音列表为静态预置，无需异步加载。
 */
import { createTTSService, languageMap } from '../utils/ai'
import type { TTSVoice } from '../utils/ai'

export function useTts() {
  const ttsService = createTTSService()

  const text = ref('')
  const selectedLang = ref('zh-CN')
  const selectedVoice = ref('')
  const selectedGender = ref<'female' | 'male'>('female')
  const rate = ref(1)
  const pitch = ref(1)
  const volume = ref(1)
  const isSpeaking = ref(false)
  const isPaused = ref(false)
  const error = ref('')
  const voices = ref<TTSVoice[]>([])

  const isSupported = computed(() => ttsService.isSupported())

  const filteredVoices = computed(() => {
    return ttsService.getVoicesByLanguage(selectedLang.value, selectedGender.value)
  })

  onMounted(() => {
    // edge-tts 语音列表为静态预置，无需异步加载
    voices.value = ttsService.getVoices()
  })

  const handleSpeak = async () => {
    if (!text.value.trim()) return

    error.value = ''
    isSpeaking.value = true
    isPaused.value = false

    try {
      const voice = selectedVoice.value
        ? voices.value.find(v => v.voiceURI === selectedVoice.value)
        : undefined

      await ttsService.speak({
        text: text.value,
        lang: selectedLang.value,
        rate: rate.value,
        pitch: pitch.value,
        volume: volume.value,
        voice,
        // 显式选了语音时不传 gender（让 voice 优先），否则按性别筛选
        gender: voice ? undefined : selectedGender.value
      })
    } catch (e: any) {
      error.value = e.message || '语音合成失败'
    } finally {
      isSpeaking.value = false
      isPaused.value = false
    }
  }

  const handlePause = () => {
    if (isPaused.value) {
      ttsService.resume()
      isPaused.value = false
    } else {
      ttsService.pause()
      isPaused.value = true
    }
  }

  const handleStop = () => {
    ttsService.stop()
    isSpeaking.value = false
    isPaused.value = false
  }

  return {
    text,
    selectedLang,
    selectedVoice,
    selectedGender,
    rate,
    pitch,
    volume,
    isSpeaking,
    isPaused,
    error,
    voices,
    isSupported,
    filteredVoices,
    handleSpeak,
    handlePause,
    handleStop,
    languageMap,
  }
}
