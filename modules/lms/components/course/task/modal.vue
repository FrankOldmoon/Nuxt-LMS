<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-3xl' }" scrollable>
        <template #content>
            <div class="p-6">
                <!-- 标题栏 -->
                <div class="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <UIcon :name="typeIcon" class="size-5 text-primary-500" />
                    <h3 class="text-lg font-semibold">{{ title }}</h3>
                    <UBadge :color="statusColor" variant="subtle" size="sm">{{ statusText }}</UBadge>
                </div>

                <!-- 使用已有的渲染组件 -->
                <QuestionRender v-if="type === 'question' && renderNode" :node="renderNode" />
                <HomeworkRender v-else-if="type === 'homework' && renderNode" :node="renderNode" />
                <CommentRender v-else-if="type === 'comment' && renderNode" :node="renderNode" />
                <QuizRender v-else-if="type === 'quiz' && renderNode" :node="renderNode" />

                <!-- 无数据 -->
                <div v-else class="py-8 text-center text-gray-400">{{ t('common.noData') }}</div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import QuestionRender from '../../ueditor/extensions/nodes/vue/question/render.vue'
import HomeworkRender from '../../ueditor/extensions/nodes/vue/homework/render.vue'
import CommentRender from '../../ueditor/extensions/nodes/vue/comment/render.vue'
import QuizRender from '../../ueditor/extensions/nodes/vue/quiz/render.vue'
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    type: { type: String, default: '' },   // question | homework | comment | quiz
    id: { type: Number, default: 0 },
    status: { type: String, default: '' },  // done | partial | todo
})

// 构造 node 对象供渲染组件使用（与 Tiptap vue node 格式一致）
const renderNode = computed(() => {
    if (!props.id || !props.type) return null
    return {
        attrs: {
            content: props.id,
            type: props.type,
        },
    }
})

// 类型图标
const typeIcon = computed(() =>
    props.type === 'question' ? 'i-lucide-help-circle' :
    props.type === 'homework' ? 'i-lucide-file-text' :
    props.type === 'comment' ? 'i-lucide-message-circle' :
    props.type === 'quiz' ? 'i-lucide-quiz' : ''
)

// 标题
const title = computed(() => {
    const typeName = props.type === 'question' ? t('coursePanel.question')
        : props.type === 'homework' ? t('coursePanel.homework')
        : props.type === 'comment' ? t('coursePanel.comment')
        : props.type === 'quiz' ? t('coursePanel.quiz') : ''
    return `${typeName} #${props.id}`
})

// 状态颜色和文本
const statusColor = computed(() => {
    switch (props.status) {
        case 'done': return 'success'
        case 'partial': return 'warning'
        default: return 'neutral'
    }
})
const statusText = computed(() => {
    switch (props.status) {
        case 'done': return t('coursePanel.done')
        case 'partial': return t('coursePanel.partial')
        default: return t('coursePanel.todo')
    }
})
</script>
