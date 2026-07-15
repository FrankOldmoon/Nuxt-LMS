<template>
    <div class="flex items-start gap-3 p-3 rounded-lg"
        :class="isRoot ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'">
        <!-- User Card -->
        <div class="w-20 flex-shrink-0">
            <AuthUserCard :user="userObj" />
        </div>

        <div class="flex-1 min-w-0">
            <!-- Time + Action button -->
            <div class="flex items-center gap-2 mb-1">
                <span v-if="comment.createdAt" class="text-xs text-gray-400">{{ formatTime(comment.createdAt) }}</span>
                <!-- Action buttonbyRight -->
                <div class="flex items-center gap-2 ml-auto">
                    <!-- Like -->
                    <button class="flex items-center gap-1 text-xs transition-colors"
                        :class="comment.liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'"
                        @click="$emit('toggle-like', comment)">
                        <UIcon :name="comment.liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                            class="w-3.5 h-3.5" />
                        <span>{{ comment.likeCount || 0 }}</span>
                    </button>
                    <!-- Delete（withConfirm） -->
                    <UPopover v-if="canDelete" :modal="true">
                        <button
                            class="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                            <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                            <span>{{ $t('common.delete') }}</span>
                        </button>
                        <template #content>
                            <div class="p-3 space-y-2 w-48">
                                <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('comment.confirm delete') }}
                                </p>
                                <div class="flex justify-end gap-2">
                                    <UButton size="xs" color="error" @click="confirm delete">
                                        {{ $t('common.delete') }}
                                    </UButton>
                                </div>
                            </div>
                        </template>
                    </UPopover>
                </div>
            </div>

            <!-- Content -->
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

// construct user Objectfor AuthUserCard makeuse
const userObj = computed(() => ({
    id: props.comment.userId,
    name: props.comment.name || props.comment.userName || 'U',
    preferName: props.comment.userName || props.comment.name || null,
    avatarImg: props.comment.avatarImg || null,
    rollNumber: null,
}))

// YesNocanDelete：AuthorlocalPersonorTeacher/Admin
const canDelete = computed(() => {
    if (hasRole('teacher') || hasRole('admin')) return true
    return props.comment.userId === props.currentUserId
})

// Confirm Delete
function confirmDelete() {
    emit('delete', props.comment)
    const el = document.querySelector('[data-state="open"][role="dialog"]')
    el?.click()
}
</script>
