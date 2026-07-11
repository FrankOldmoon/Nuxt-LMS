<template>
  <div class="tts-container p-4 bg-white rounded-lg shadow">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        输入文本
      </label>
      <textarea
        v-model="text"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="请输入要朗读的文本..."
      />
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          语言
        </label>
        <select
          v-model="selectedLang"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="(name, code) in languageMap" :key="code" :value="code">
            {{ name }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          语音
        </label>
        <select
          v-model="selectedVoice"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">默认语音</option>
          <option
            v-for="voice in filteredVoices"
            :key="voice.voiceURI"
            :value="voice.voiceURI"
          >
            {{ voice.name }} ({{ voice.lang }})
          </option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          性别
        </label>
        <select
          v-model="selectedGender"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="female">女声</option>
          <option value="male">男声</option>
        </select>
      </div>
    </div>

    <div class="space-y-3 mb-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          语速: {{ rate.toFixed(1) }}
        </label>
        <input
          v-model.number="rate"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          音调: {{ pitch.toFixed(1) }}
        </label>
        <input
          v-model.number="pitch"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          音量: {{ volume.toFixed(1) }}
        </label>
        <input
          v-model.number="volume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          class="w-full"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleSpeak"
        :disabled="!text || isSpeaking"
        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ isSpeaking ? '播放中...' : '播放' }}
      </button>

      <button
        v-if="isSpeaking"
        @click="handlePause"
        class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
      >
        {{ isPaused ? '继续' : '暂停' }}
      </button>

      <button
        v-if="isSpeaking"
        @click="handleStop"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        停止
      </button>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <div v-if="!isSupported" class="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
      语音合成需要在浏览器环境中使用
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createTTSService, languageMap } from '../../utils/ai'
import type { TTSVoice } from '../../utils/ai'

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
</script>

<style scoped>
.tts-container {
  max-width: 600px;
}
</style>