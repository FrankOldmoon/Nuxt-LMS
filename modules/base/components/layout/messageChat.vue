<template>
  <div class="flex-1 flex flex-col min-w-0">
    <template v-if="selectedUserId">
      <!-- 聊天头部 -->
      <div class="flex items-center gap-2 p-3 border-b border-default">
        <UAvatar :src="selectedUser?.avatarImg || undefined" :alt="selectedUser?.name" size="xs"
          :text="selectedUser?.name?.charAt(0)" />
        <span class="text-sm font-medium">{{ selectedUser?.name }}</span>
      </div>
      <!-- 消息列表 -->
      <div ref="msgContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
        <div v-if="msgLoading" class="flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-muted" />
        </div>
        <div v-else-if="!messages.length" class="text-center text-xs text-muted py-8">
          {{ t('message.empty') }}
        </div>
        <div v-for="msg in messages" :key="msg.id"
          class="flex" :class="msg.senderUserId === user?.id ? 'justify-end' : 'justify-start'">
          <div class="max-w-[70%] rounded-lg px-3 py-1.5 text-sm"
            :class="msg.senderUserId === user?.id
              ? 'bg-primary text-white'
              : 'bg-muted text-default'">
            <p class="break-words">{{ msg.content?.text || '' }}</p>
            <p class="text-[9px] mt-0.5 opacity-60">{{ formatMsgTime(msg.createdAt) }}</p>
          </div>
        </div>
      </div>
      <!-- 输入框 -->
      <div class="p-3 border-t border-default flex gap-2">
        <UInput v-model="inputText" :placeholder="t('message.inputPlaceholder')" class="flex-1"
          size="sm" @keyup.enter="sendMessage" />
        <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim()"
          :loading="sending" @click="sendMessage" />
      </div>
    </template>
    <div v-else class="flex-1 flex items-center justify-center text-sm text-muted">
      {{ t('message.selectConversation') }}
    </div>
  </div>
</template>

<script setup>
const {
  t, user, selectedUserId, selectedUser, messages, msgLoading, msgContainer,
  inputText, sending, sendMessage, formatMsgTime,
} = useMessagesContext()
</script>
