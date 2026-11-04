<template>
  <div class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
    <div class="shrink-0 size-7 rounded-full flex items-center justify-center"
      :class="msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'">
      <UIcon :name="msg.role === 'user' ? 'i-lucide-user' : 'i-lucide-bot'" class="size-4" />
    </div>
    <div class="max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed"
      :class="msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'">
      <!-- 思考过程（可折叠） -->
      <div v-if="msg.reasoning" class="mb-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
        <div class="flex items-center gap-1 cursor-pointer select-none hover:opacity-70" @click="toggleReasoning(idx)">
          <UIcon :name="msg._reasoningExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3 text-gray-400" />
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ t('ueditor.aichatReasoning') }}</span>
        </div>
        <div v-if="msg._reasoningExpanded" class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed" v-html="renderContent(msg.reasoning)" />
      </div>
      <!-- 消息内容：用户消息按纯文本渲染（保留换行），assistant 才走富文本 -->
      <p v-if="msg.role === 'user'" class="whitespace-pre-wrap break-words">{{ textOf(msg) }}</p>
      <ueditorRender v-else :json="msg.content" :markdown="!msg._streaming" />
      <!-- 朗读按钮（仅 assistant 文本消息） -->
      <div v-if="canSpeak(msg)" class="flex justify-end mt-1">
        <button type="button" class="text-xs flex items-center gap-1 transition-colors"
          :class="speakingIdx === idx ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'"
          @click="toggleSpeakMessage(idx)">
          <UIcon :name="speakingIdx === idx ? 'i-lucide-square' : 'i-lucide-volume-2'" class="size-3" />
          <span>{{ speakingIdx === idx ? t('ai.stopSpeaking') : t('ai.speak') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ msg: ChatMessage; idx: number }>()

const { t } = useI18n()
const { renderContent, toggleReasoning, canSpeak, toggleSpeakMessage, speakingIdx } = useChatboxContext()

/** 用户消息一律是字符串；兜底防止非字符串内容渲染成 [object Object] */
function textOf(msg: ChatMessage) {
  return typeof msg.content === 'string' ? msg.content : String(msg.content ?? '')
}
</script>
