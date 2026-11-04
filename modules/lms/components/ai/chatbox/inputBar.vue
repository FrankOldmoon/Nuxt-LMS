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

    <div class="flex items-end gap-2 px-3 py-2">
      <!-- 多行输入：Enter 发送，Shift+Enter 换行，随内容自动增高（最多 6 行） -->
      <UTextarea
        v-model="inputText"
        :placeholder="placeholder || t('ueditor.aichatInputPlaceholder')"
        :rows="1"
        :maxrows="6"
        autoresize
        size="sm"
        class="flex-1"
        :disabled="loading || disabled"
        @keydown="onKeydown"
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

/**
 * Enter 发送 / Shift+Enter 换行。
 * 必须挡掉输入法组词状态：中文拼音选词时按 Enter 是确认候选词，
 * 不判断 isComposing 会直接把半截拼音发出去。
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  if (e.isComposing || e.keyCode === 229) return
  if (e.shiftKey) return // 让 textarea 自己插入换行
  e.preventDefault()
  handleSend()
}
</script>
