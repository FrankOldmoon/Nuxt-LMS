<template>
    <div
        class="question-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('question.loading') }}</span>
        </div>

        <!-- 题目未找到 -->
        <div v-else-if="!question" class="text-center py-6 text-gray-400">
            {{ $t('question.notFound') }} (cid: {{ questionId }})
        </div>

        <template v-else>
            {{ question.record }}
            <!-- 右上角编辑按钮 -->
            <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                class="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity z-10"
                @click="editOpen = true" />

            <!-- 题目标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span
                    class="px-2 py-0.5 bg-blue-50 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                    {{ typeLabel[question.type] }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ question.name }}</span>
                <span class="text-xs text-gray-400 ml-auto">{{ question.point }}{{ $t('question.points') }}</span>
            </div>

            <!-- 题目内容（非填空题型渲染富文本） -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="question.content" />
            </div>
            <!-- 题型特定渲染 -->
            <component v-if="renderComponent" :is="renderComponent" :question="question" :question-id="questionId" />
        </template>

        <!-- 编辑弹窗 -->
        <QuestionEdit v-model="editOpen" :question-id="questionId" :question="question" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive } from 'vue'
import SingleRender from './question/single.vue'
import JudgeRender from './question/judge.vue'
import MultipleRender from './question/multiple.vue'
import FillRender from './question/fill.vue'
import QuestionEdit from '../../../extensions/nodes/vue/question/edit.vue'

const props = defineProps({
    node: Object,
})

const { t } = useI18n()
const { editableCourseId } = useLayoutState()

const questionId = computed(() => Number(props.node?.attrs?.content) || 0)

const typeLabel = computed(() => ({
    single: t('question.typeSingle'),
    judge: t('question.typeJudge'),
    multiple: t('question.typeMultiple'),
    fill: t('question.typeFill'),
}))

// 题型 → 渲染组件
const componentMap = { single: SingleRender, judge: JudgeRender, multiple: MultipleRender, fill: FillRender }
const renderComponent = computed(() => componentMap[question.value?.type] || null)


// SSR-friendly data fetching
const apiUrl = computed(() => {
    if (!questionId.value || !editableCourseId.value) return ''
    return `/api/lms/questions/show?course_id=${editableCourseId.value}&cid=${questionId.value}`
})

const { data: question, pending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        // 用 reactive 包装，确保嵌套属性（如 record）的 push 能触发响应式更新
        return reactive({
            name: raw.name || '',
            content: raw.content || '',
            options: Array.isArray(raw.options) ? [...raw.options] : [],
            type: raw.type || 'single',
            point: Number(raw.point) || 0,
            answer: Array.isArray(raw.answer) ? [...raw.answer] : [],
            explanation: raw.explanation || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            record: Array.isArray(raw.record) ? [...raw.record] : [],
        })
    },
})

const editOpen = ref(false)

function onSaved(ques) {
    refresh()
    question.value = ques
}
</script>

<style scoped>
.question-render {
    width: 100%;
}
</style>
