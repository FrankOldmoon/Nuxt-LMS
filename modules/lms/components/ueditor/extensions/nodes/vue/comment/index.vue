<template>
    <div class="comment-render w-full relative">
        <!-- 内联编辑面板（在上方显示） -->
        <div v-if="showConfig" class="vue-node-config">
            <Edit :comment-id="commentId" :comment="comment" :course-id="courseId" @saved="onSaved" />
        </div>

        <!-- 尚未设置内容（没有 cid）：不渲染空评论，提示先填写并保存 -->
        <div v-if="!commentId"
            class="flex items-start gap-2 p-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 text-sm text-red-500 dark:border-red-800 dark:bg-red-950/20">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0 mt-0.5" />
            <div class="flex-1">
                <p class="font-medium">{{ t('comment.unsaved') }}</p>
                <p class="text-xs mt-1 opacity-80">{{ t('comment.unsavedHint') }}</p>
            </div>
            <UButton size="2xs" color="primary" variant="soft" icon="i-lucide-settings-2" :label="t('common.edit')"
                @click="showConfig = true" />
        </div>

        <Render v-else :node="node" :comment="comment" :course-id="courseId" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Render from './render.vue'
import Edit from './edit.vue'
const { t } = useI18n()

const props = defineProps(nodeViewProps)

const { courseId } = useLmsContext()

// inject node-view 提供的状态
const showConfig = inject('nodeViewShowConfig', ref(false))
const meta = inject('nodeViewMeta', reactive({ title: '', icon: '', hasSettings: false }))

// 设置组件元信息（告知 node-view 显示设置按钮）
if (meta) {
    meta.title = t('comment.label')
    meta.icon = 'i-lucide-message-circle'
    meta.hasSettings = true
}

const emit = defineEmits(['init'])

const commentId = computed(() => Number(props.node?.attrs?.content) || 0)

// 获取评论数据
const apiUrl = computed(() => {
    if (!commentId.value || !courseId.value) return ''
    return `/api/comments/show?course_id=${courseId.value}&cid=${commentId.value}`
})

const { data: comment } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw || typeof raw !== 'object') return null
        return {
            name: raw.name || '',
            content: raw.content || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            point: Number(raw.point) || 0,
        }
    },
})

// 新建评论时拿到 cid 后通知父节点更新 content 属性
function onSaved(cm) {
    if (cm.cid && Number(cm.cid) !== commentId.value) {
        emit('init', cm.cid)
        props.updateAttributes({ content: String(cm.cid) })
    }
    // 编辑保存后关闭配置面板
    if (showConfig.value) {
        showConfig.value = false
    }
}
</script>
