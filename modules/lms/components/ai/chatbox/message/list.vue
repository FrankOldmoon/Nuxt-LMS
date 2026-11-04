<template>
  <div ref="msgListRef" class="flex-1 overflow-y-auto p-3 space-y-3" @scroll="onScroll">
    <AiChatboxMessageItem v-for="item in visible" :key="item.idx" :msg="item.msg" :idx="item.idx" />

    <!-- 加载中 -->
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

// system 消息是内部事件（题目作答结果、学情摘要），只喂给模型，不给用户看。
// 保留原索引，因为上层的 toggleReasoning 等操作按下标改数组。
const visible = computed(() =>
  (messages.value || [])
    .map((msg: any, idx: number) => ({ msg, idx }))
    .filter(({ msg }: any) => msg?.role !== 'system'),
)
</script>
