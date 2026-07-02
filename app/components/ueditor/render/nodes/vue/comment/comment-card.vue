<template>
    <div class="flex items-start gap-3 p-3 rounded-lg"
        :class="isRoot ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'">
        <!-- 头像 -->
        <UAvatar :src="comment.avatarImg || undefined" :alt="comment.name || comment.userName || 'U'" size="xs"
            :text="(comment.name || comment.userName || 'U')?.charAt(0)" />

        <div class="flex-1 min-w-0">
            <!-- 用户名 + 时间 + 操作按钮 -->
            <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ comment.userName || comment.name || $t('comment.anonymous') }}
                </span>
                <span v-if="comment.createdAt" class="text-xs text-gray-400">{{ formatTime(comment.createdAt) }}</span>
                <!-- 操作按钮靠右 -->
                <div class="flex items-center gap-2 ml-auto">
                    <!-- 点赞 -->
                    <button class="flex items-center gap-1 text-xs transition-colors"
                        :class="comment.liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'"
                        @click="$emit('toggle-like', comment)">
                        <UIcon :name="comment.liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                            class="w-3.5 h-3.5" />
                        <span>{{ comment.likeCount || 0 }}</span>
                    </button>
                    <!-- 删除（带确认） -->
                    <UPopover v-if="canDelete" :modal="true">
                        <button
                            class="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                            <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                            <span>{{ $t('common.delete') }}</span>
                        </button>
                        <template #content>
                            <div class="p-3 space-y-2 w-48">
                                <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('comment.confirmDelete') }}
                                </p>
                                <div class="flex justify-end gap-2">
                                    <UButton size="xs" color="error" @click="confirmDelete">
                                        {{ $t('common.delete') }}
                                    </UButton>
                                </div>
                            </div>
                        </template>
                    </UPopover>
                </div>
            </div>

            <!-- 内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="comment.content" />
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    comment: { type: Object, required: true },
    isRoot: { type: Boolean, default: false },
    currentUserId: { type: Number, default: null },
})

const emit = defineEmits(['toggle-like', 'delete'])

const { hasRole } = useAuth()

// 是否可删除：作者本人或教师/管理员
const canDelete = computed(() => {
    if (hasRole('teacher') || hasRole('admin')) return true
    return props.comment.userId === props.currentUserId
})

// 确认删除
function confirmDelete() {
    emit('delete', props.comment)
    const el = document.querySelector('[data-state="open"][role="dialog"]')
    el?.click()
}
</script>
