<template>
  <div class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    <!-- 监听状态 / 语音错误 -->
    <div v-if="isListening || interimText || voiceError" class="px-3 pt-2 flex items-center gap-2 text-xs flex-wrap">
      <span v-if="isListening" class="flex items-center gap-1 text-red-500">
        <span class="size-2 rounded-full bg-red-500 animate-pulse" />
        {{ t('ai.listening') }}
      </span>
      <span v-if="interimText" class="text-gray-500 dark:text-gray-400 truncate max-w-full">{{ interimText }}</span>
      <span v-if="voiceError" class="text-red-500">{{ voiceError }}</span>
    </div>

    <div class="flex gap-2 px-3 py-2">
      <UInput
        v-model="inputText"
        :placeholder="placeholder || t('ueditor.aichatInputPlaceholder')"
        size="sm"
        class="flex-1"
        :disabled="loading || disabled"
        @keydown.enter="handleSend"
      />
      <!-- 语音输入 -->
      <UButton
        v-if="enableVoiceInput && asrSupported"
        :icon="isListening ? 'i-lucide-square' : 'i-lucide-mic'"
        :color="isListening ? 'error' : 'neutral'"
        :variant="isListening ? 'solid' : 'outline'"
        size="sm"
        :title="isListening ? t('ai.stopListening') : t('ai.startListening')"
        @click="toggleVoiceInput"
      />
      <!-- 语音输出开关 -->
      <UButton
        v-if="enableVoiceOutput && ttsSupported"
        :icon="voiceOutputEnabled ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
        :color="voiceOutputEnabled ? 'primary' : 'neutral'"
        variant="outline"
        size="sm"
        :title="t('ai.voiceOutput')"
        @click="toggleVoiceOutput"
      />
      <UButton
        icon="i-lucide-send"
        color="primary"
        size="sm"
        :loading="loading"
        :disabled="!inputText.trim() || disabled"
        @click="handleSend"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  placeholder?: string
  enableVoiceInput?: boolean
  enableVoiceOutput?: boolean
  disabled?: boolean
}>()

const { t } = useI18n()
const {
  inputText, loading,
  asrSupported, ttsSupported, isListening, interimText, voiceError,
  voiceOutputEnabled,
  toggleVoiceInput, toggleVoiceOutput, handleSend,
} = useChatboxContext()
</script>
