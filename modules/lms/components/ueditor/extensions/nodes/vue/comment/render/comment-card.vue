<template>
    <div class="flex items-start gap-3 p-3 rounded-xl transition-all"
        :class="isRoot ? 'bg-gray-50 dark:bg-gray-800/70' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'">
        <!-- 用户卡片 -->
        <div class="w-20 flex-shrink-0">
            <AuthUserCard :user="userObj" />
        </div>

        <div class="flex-1 min-w-0">
            <!-- 时间 + 操作按钮 -->
            <div class="flex items-center gap-2 mb-1">
                <!-- 时间只应在客户端(浏览器本地时区)渲染；SSR 阶段留空避免服务端/客户端时区不一致导致显示 UTC -->
                <span v-if="comment.createdAt && hydratedTime" class="text-xs text-gray-400">{{ formatTime(comment.createdAt) }}</span>
                <!-- 操作按钮靠右 -->
                <div class="flex items-center gap-2 ml-auto">
                    <!-- 点赞 -->
                    <button class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors"
                        :class="comment.liked ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'"
                        @click="$emit('toggle-like', comment)">
                        <UIcon :name="comment.liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                            class="w-3.5 h-3.5" />
                        <span>{{ comment.likeCount || 0 }}</span>
                    </button>
                    <!-- 待审核标识：作者本人也能看到自己未过审的评论，需要知道它还没公开 -->
                    <span v-if="comment.status === 'audit'"
                        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300">
                        <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                        <span>{{ $t('comment.auditPending') }}</span>
                    </span>
                    <!-- 批准（仅老师/管理员） -->
                    <template v-if="isTeacher && comment.status === 'audit'">
                        <button
                            class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 hover:text-emerald-600 hover:bg-emerald-50 dark:bg-amber-900/30 dark:hover:bg-emerald-900/30 transition-colors"
                            @click="$emit('approve', comment)">
                            <UIcon name="i-heroicons-check-badge" class="w-3.5 h-3.5" />
                            <span>{{ $t('comment.approve') }}</span>
                        </button>
                    </template>
                    <!-- 删除（带确认） -->
                    <UPopover v-if="canDelete" :modal="true">
                        <button
                            class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                            <span>{{ $t('common.delete') }}</span>
                        </button>
                        <template #content>
                            <div class="p-3 space-y-2 w-48">
                                <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('comment.confirmDelete') }}
                                </p>
                                <div class="flex justify-end gap-2">
                                    <UButton size="xs" color="error" variant="solid" @click="confirmDelete">
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
import { onMounted } from 'vue'

const props = defineProps({
    comment: { type: Object, required: true },
    isRoot: { type: Boolean, default: false },
    currentUserId: { type: Number, default: null },
})

const emit = defineEmits(['toggle-like', 'delete', 'approve'])

const { hasRole } = useAuth()

// 仅客户端渲染时间（浏览器本地时区），避免 SSR 阶段按服务器时区输出导致时区不一致
const hydratedTime = ref(false)
onMounted(() => { hydratedTime.value = true })

// 是否老师/管理员
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

// 构造 user 对象供 AuthUserCard 使用
const userObj = computed(() => ({
    id: props.comment.userId,
    name: props.comment.name || props.comment.userName || 'U',
    preferName: props.comment.userName || props.comment.name || null,
    avatarImg: props.comment.avatarImg || null,
    avatarFrame: props.comment.avatarFrame || null,
    rollNumber: null,
}))

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
