<template>
  <div ref="msgListRef" class="flex-1 overflow-y-auto p-3 space-y-3" @scroll="onScroll">
    <AiChatboxMessageItem v-for="(msg, idx) in messages" :key="idx" :msg="msg" :idx="idx" />

    <!-- Loading -->
    <div v-if="loading" class="flex gap-2">
      <div class="shrink-0 size-7 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
        <UIcon name="i-lucide-bot" class="size-4" />
      </div>
      <div class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-1" />
        {{ t('ueditor.aichatThinking') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { msgListRef, messages, loading, onScroll } = useChatboxContext()
</script>
