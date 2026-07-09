<template>
  <div class="asr-container p-4 bg-white rounded-lg shadow">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        选择语言
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

    <div class="mb-4 flex items-center gap-4">
      <label class="flex items-center">
        <input
          v-model="continuous"
          type="checkbox"
          class="mr-2"
        />
        <span class="text-sm text-gray-700">连续识别</span>
      </label>

      <label class="flex items-center">
        <input
          v-model="interimResults"
          type="checkbox"
          class="mr-2"
        />
        <span class="text-sm text-gray-700">显示中间结果</span>
      </label>
    </div>

    <div class="mb-4">
      <button
        @click="handleToggle"
        :class="[
          'px-6 py-3 rounded-full text-white font-medium transition-all',
          isListening
            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700'
        ]"
      >
        <div class="flex items-center gap-2">
          <svg
            v-if="isListening"
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="6" />
          </svg>
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <span>{{ isListening ? '停止识别' : '开始识别' }}</span>
        </div>
      </button>
    </div>

    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        识别结果
      </label>
      <div
        class="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
      >
        <div v-if="finalTranscript" class="text-gray-900">
          {{ finalTranscript }}
        </div>
        <div
          v-if="interimTranscript"
          class="text-gray-500 italic"
        >
          {{ interimTranscript }}
        </div>
        <div
          v-if="!finalTranscript && !interimTranscript"
          class="text-gray-400"
        >
          点击"开始识别"按钮开始语音识别...
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleClear"
        :disabled="!finalTranscript"
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        清空
      </button>

      <button
        @click="handleCopy"
        :disabled="!finalTranscript"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        复制
      </button>
    </div>

    <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
      {{ error }}
    </div>

    <div v-if="!isSupported" class="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
      您的浏览器不支持 Web Speech API 语音识别功能
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createASRService, languageMap } from '../../utils/ai'

const asrService = createASRService()

const selectedLang = ref('zh-CN')
const continuous = ref(false)
const interimResults = ref(true)
const isListening = ref(false)
const finalTranscript = ref('')
const interimTranscript = ref('')
const error = ref('')

const isSupported = asrService.isSupported()

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

  try {
    await navigator.clipboard.writeText(finalTranscript.value)
    // 可选：显示复制成功提示
  } catch (e) {
    error.value = '复制失败'
  }
}

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
</script>

<style scoped>
.asr-container {
  max-width: 600px;
}

.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>