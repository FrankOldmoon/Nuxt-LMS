<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
    <!-- Title -->
    <div v-if="title" class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-medium text-sm">
      <UIcon name="i-lucide-bot" class="text-blue-500 size-4" />
      <span>{{ title }}</span>
    </div>

    <!-- Chatinterface -->
    <div class="flex flex-col" :class="heightClass">
      <AiChatboxMessageList />
      <AiChatboxInputBar
        :placeholder="placeholder"
        :enable-voice-input="enableVoiceInput"
        :enable-voice-output="enableVoiceOutput"
        :disabled="disabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '../../../composables/useChatbox'

const props = withDefaults(defineProps<{
  title?: string
  placeholder?: string
  opening?: string
  preset?: string
  model?: string
  thinking?: boolean
  apiUrl?: string
  customSend?: (messages: ChatMessage[], onChunk: (content: string, reasoning?: string) => void) => Promise<{ content: string; reasoning?: string } | void>
  enableVoiceInput?: boolean
  enableVoiceOutput?: boolean
  voiceLang?: string
  ttsGender?: 'female' | 'male'
  disabled?: boolean
  heightClass?: string
}>(), {
  enableVoiceInput: true,
  enableVoiceOutput: true,
  ttsGender: 'female',
  disabled: false,
  heightClass: 'h-[450px]',
})

const emit = defineEmits<{
  message: [msg: ChatMessage]
  error: [error: Error]
  chunk: [content: string]
  'user-message': [text: string]
}>()

const ctx = useChatbox(props, emit as any)
provideChatbox(ctx)

const { messages, scrollToBottom, handleSend } = ctx

defineExpose({
  addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    scrollToBottom()
  },
  clearMessages() {
    messages.value = []
  },
  getMessages() {
    return messages.value
  },
  refreshMessages() {
    messages.value = [...messages.value]
  },
  send(text: string) {
    if (typeof text === 'string' && text.trim()) handleSend(text)
  },
})
</script>
