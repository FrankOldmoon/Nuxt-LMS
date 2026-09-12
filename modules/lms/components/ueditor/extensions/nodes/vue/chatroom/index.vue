<template>
    <!-- lms 未启用或未加入班级：显示占位 -->
    <div v-if="!canShow" class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-400 text-sm">
        {{ placeholderText }}
    </div>
    <div v-else class="chatroom-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <!-- 标题栏 -->
        <div class="flex items-center gap-3 mb-3 pr-6">
            <span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded text-xs font-medium">
                {{ $t('chatroom.label') }}
            </span>
            <span class="font-semibold text-gray-800 dark:text-gray-200">{{ $t('chatroom.title') }}</span>
            <span class="text-xs text-gray-400">{{ $t('chatroom.classOnly') }}</span>
            <div class="flex items-center gap-2 ml-auto">
                <span class="text-xs text-gray-400 flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3.5" />
                    {{ onlineCount }}
                </span>
            </div>
        </div>

        <!-- 消息列表 -->
        <div ref="msgListRef" class="chatroom-messages">
            <div v-if="!messages.length" class="text-center py-8 text-gray-400 text-sm">
                {{ $t('chatroom.empty') }}
            </div>
            <div v-for="(msg, idx) in messages" :key="idx" class="chatroom-msg" :class="{ 'is-self': msg.userId === userId }">
                <AvatarWithFrame :src="msg.avatarImg || undefined" :alt="msg.from" size="sm"
                    :text="msg.from?.charAt(0)" class="shrink-0" :frame="msg.avatarFrame || null" :userId="msg.userId" />
                <div class="chatroom-msg-body">
                    <div class="chatroom-msg-meta">
                        <span class="chatroom-msg-name">{{ msg.from }}</span>
                        <span class="chatroom-msg-time">{{ formatTime(msg.ts) }}</span>
                    </div>
                    <div class="chatroom-msg-text">{{ msg.text }}</div>
                </div>
            </div>
        </div>

        <!-- 输入区 -->
        <div class="chatroom-input-area">
            <UInput v-model="inputText" :placeholder="$t('chatroom.inputPlaceholder')" size="sm"
                class="flex-1" @keydown.enter="sendMessage" :disabled="!canChat" />
            <UButton icon="i-lucide-send" color="primary" size="sm" :disabled="!inputText.trim() || !canChat"
                @click="sendMessage" />
        </div>
        <p v-if="!canChat" class="text-xs text-gray-400 mt-1">{{ cannotChatReason }}</p>
    </div>
</template>

<script setup>
import { useChatroom } from './useChatroom'

const props = defineProps({
    node: Object,
})

const {
    canShow, placeholderText, canChat, cannotChatReason,
    messages, inputText, msgListRef, onlineCount, userId, sendMessage, formatTime,
} = useChatroom(props)
</script>

<style scoped src="./chatroom.css"></style>
