<template>
  <div class="w-64 shrink-0 border-r border-default flex flex-col">
    <div class="p-3 border-b border-default">
      <h3 class="text-sm font-semibold">{{ t('message.title') }}</h3>
    </div>
    <!-- Search users -->
    <div class="p-2 border-b border-default">
      <UInput v-model="searchKeyword" :placeholder="t('message.searchUser')" icon="i-lucide-search"
        size="xs" class="w-full" @input="onSearchInput" />
      <div v-if="searchResults.length" class="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
        <button v-for="u in searchResults" :key="u.id"
          class="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-muted text-left"
          @click="startConversation(u)">
          <UAvatar :src="u.avatarImg || undefined" :alt="u.name" size="2xs" :text="u.name?.charAt(0)" />
          <span class="text-xs truncate">{{ u.name }}</span>
        </button>
      </div>
    </div>
    <!-- Conversation list -->
    <div class="flex-1 overflow-y-auto">
      <button v-for="conv in conversations" :key="conv.userId"
        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left transition-colors"
        :class="selectedUserId === conv.userId ? 'bg-primary/10' : ''"
        @click="selectConversation(conv.userId)">
        <div class="relative shrink-0">
          <UAvatar :src="conv.avatarImg || undefined" :alt="conv.name" size="xs" :text="conv.name?.charAt(0)" />
          <span v-if="conv.unreadCount > 0"
            class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
            {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium truncate">{{ conv.name }}</div>
          <div class="text-[10px] text-muted truncate">{{ conv.lastMessage?.text || t('message.empty') }}</div>
        </div>
      </button>
      <div v-if="!conversations.length" class="text-center text-xs text-muted py-8">
        {{ t('message.noConversations') }}
      </div>
    </div>
  </div>
</template>

<script setup>
const {
  t, conversations, selectedUserId, searchKeyword, searchResults,
  onSearchInput, startConversation, selectConversation,
} = useMessagesContext()
</script>
