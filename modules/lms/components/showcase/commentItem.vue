<template>
    <div class="flex gap-3 p-3 rounded-lg border border-default bg-white dark:bg-gray-900">
        <AvatarWithFrame :src="comment.avatarImg || undefined" :alt="comment.userName || '?'" :text="(comment.userName || '?').charAt(0)" size="sm" :frame="comment.avatarFrame || null" :userId="comment.userId" />
        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium">{{ comment.userName || '…' }}</span>
                <span v-if="hydrated" class="text-xs text-muted">{{ localTime(comment.createdAt) }}</span>
                <div class="ml-auto flex items-center gap-2">
                    <button v-if="isLoggedIn" class="text-xs text-muted hover:text-primary" @click="$emit('reply', comment)">
                        {{ $t('showcase.reply') }}
                    </button>
                    <button v-if="canDelete" class="text-xs text-muted hover:text-red-500" @click="$emit('delete', comment)">
                        {{ $t('common.delete') }}
                    </button>
                </div>
            </div>
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditor-render :json="comment.content" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'

const props = defineProps({
    comment: { type: Object, required: true },
    currentUserId: { type: Number, default: null },
})
defineEmits(['reply', 'delete'])

const { user, hasRole } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const canDelete = computed(() =>
    hasRole('admin') || hasRole('teacher') || props.comment.userId === props.currentUserId,
)

// 时间仅客户端渲染，避免 SSR 时区不一致
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })

function localTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>