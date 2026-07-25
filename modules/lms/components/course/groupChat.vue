<template>
  <div class="w-full flex flex-col h-full">
    <!-- 消息列表 -->
    <div ref="msgListRef"
      class="flex-1 min-h-0 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-md flex flex-col gap-2">
      <div v-if="!messages.length" class="text-center py-8 text-gray-400 text-sm">
        {{ $t('chatroom.empty') }}
      </div>
      <div v-for="(msg, idx) in messages" :key="idx"
        class="flex gap-2 items-start"
        :class="{ 'flex-row-reverse': msg.userId === userId }">
        <UAvatar :src="msg.avatarImg || undefined" :alt="msg.from" size="sm"
          :text="msg.from?.charAt(0)" class="shrink-0" />
        <div class="min-w-0 max-w-[80%] flex flex-col">
          <div class="flex items-center gap-1.5 mb-0.5"
            :class="{ 'flex-row-reverse': msg.userId === userId }">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ msg.from }}</span>
            <span class="text-[11px] text-gray-400">{{ formatTime(msg.ts) }}</span>
          </div>
          <div class="px-2.5 py-1.5 rounded-lg text-[13px] break-words whitespace-pre-wrap border"
            :class="msg.userId === userId
              ? 'bg-indigo-500 text-white border-transparent'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'">
            {{ msg.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="flex gap-2 items-center mt-3">
      <UInput v-model="inputText" :placeholder="$t('chatroom.inputPlaceholder')" size="sm"
        class="flex-1" @keydown.enter="sendMessage" :disabled="!canChat" />
      <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim() || !canChat"
        @click="sendMessage" />
    </div>
    <p v-if="!canChat" class="text-xs text-gray-400 mt-1">{{ cannotChatReason }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  groupId: string
}>()

const {
  messages,
  inputText,
  msgListRef,
  canChat,
  cannotChatReason,
  sendMessage,
  formatTime,
  userId,
} = useGroupChat(props)
</script>
