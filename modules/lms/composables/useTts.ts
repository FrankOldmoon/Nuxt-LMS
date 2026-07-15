/**
 * useTts — Text-to-speech composable
 *
 * Wraps edge-tts service play/pause/stop logic and voice list filtering.
 * Voice list is statically preset, no async loading required.
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
    // edge-tts voice list is statically preset, no async loading required
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
        // When a voice is explicitly selected, do not pass gender (let voice take priority); otherwise filter by gender
        gender: voice ? undefined : selectedGender.value
      })
    } catch (e: any) {
      error.value = e.message || 'Speech synthesis failed'
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
