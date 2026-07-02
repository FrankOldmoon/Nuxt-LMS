<template>
    <div class="question-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-question-id="questionId">
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

            <!-- 题目内容（所有题型统一在此渲染富文本） -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="question.content" />
            </div>

            <!-- 题型特定渲染 -->
            <component v-if="renderComponent" ref="renderRef" :is="renderComponent" :question="question"
                :question-id="questionId" />
        </template>

        <!-- 提交/重置（公共） -->
        <div v-if="question" class="flex items-center gap-2 pt-3">
            <!-- 标签 -->
            <div v-if="question.tags && question.tags.length" class="flex flex-wrap gap-1">
                <span v-for="(tag, idx) in question.tags" :key="idx"
                    class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                    {{ tag }}
                </span>
            </div>
            <div class="flex gap-2 ml-auto">
                <UButton variant="soft" size="sm" :disabled="!hasAnswer || submitted" @click="onReset">
                    {{ $t('common.reset') }}
                </UButton>
                <UButton color="primary" size="sm" :disabled="!hasAnswer" @click="onSubmit">
                    {{ $t('question.submit') }}
                </UButton>
            </div>
        </div>

        <!-- 结果（公共） -->
        <div v-if="submitted" class="mt-4 space-y-3">
            <ResultBanner :correct="isCorrect" :point="question?.point" />
            <ExplanationBlock :explanation="question?.explanation" />
        </div>

        <!-- 显示答案（仅教师可见，一直显示） -->
        <div v-if="question && isTeacher" class="mt-4 flex items-start gap-2">
            <UButton variant="soft" size="sm" @click="onShowAnswer">
                {{ showAnswer ? $t('question.hideAnswer') : $t('question.showAnswer') }}
            </UButton>
            <div v-if="showAnswer" class="flex-1">
                <!-- 正确答案 -->
                <div class="mb-2">
                    <span class="text-sm text-gray-500">{{ $t('question.correctAnswerLabel') }}</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                        <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                            class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                            <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                        </div>
                    </div>
                </div>
                <!-- 答案解析 -->
                <ExplanationBlock v-if="question?.explanation" :explanation="question?.explanation" />
            </div>
        </div>

        <!-- 编辑弹窗 -->
        <QuestionEdit v-model="editOpen" :question-id="questionId" :question="question" @saved="onSaved" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, provide } from 'vue'
import SingleRender from './question/single.vue'
import JudgeRender from './question/judge.vue'
import MultipleRender from './question/multiple.vue'
import FillRender from './question/fill.vue'
import ResultBanner from './question/result-banner.vue'
import ExplanationBlock from './question/explanation-block.vue'
import QuestionEdit from '../../../extensions/nodes/vue/question/edit.vue'

const props = defineProps({
    node: Object,
})

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const { hasRole } = useAuth()

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
const renderRef = ref(null)

// 公共状态
const submitted = ref(false)
const isCorrect = ref(false)
const showAnswer = ref(false)

// provide 给子组件，让子组件能感知提交状态（如禁用选项、样式变化）
provide('questionSubmitted', submitted)
provide('questionIsCorrect', isCorrect)

// 子组件是否有答案（通过 ref 调用子组件暴露的 hasAnswer）
const hasAnswer = computed(() => renderRef.value?.hasAnswer ?? false)

// 是否是教师（显示答案按钮只对教师可见）
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

// 格式化答案（根据题型不同显示方式不同）
const formattedAnswers = computed(() => {
    if (!question.value?.answer) return []
    const answer = question.value.answer
    const type = question.value.type

    if (type === 'single' || type === 'multiple') {
        // 选择题：显示 A/B/C/D
        return answer.map(idx => String.fromCharCode(65 + idx))
    } else if (type === 'judge') {
        // 判断题：显示 ✓ 正确 / ✗ 错误
        return answer.map(idx => idx === 0 ? t('question.correct') : t('question.wrong'))
    } else {
        // 填空题：直接显示答案文本
        return answer
    }
})

function onSubmit() {
    if (!renderRef.value) return
    const result = renderRef.value.submit()
    if (result) {
        isCorrect.value = result.isCorrect
        submitted.value = true
    }
}

function onReset() {
    if (!renderRef.value) return
    renderRef.value.reset()
    submitted.value = false
    isCorrect.value = false
    showAnswer.value = false
    question.value.record = []
}

function onShowAnswer() {
    showAnswer.value = !showAnswer.value
    if (showAnswer.value && renderRef.value) {
        // 填充正确答案为 record
        renderRef.value.fillCorrectAnswer()
    } else {
        onReset()
    }

}

// SSR-friendly data fetching
const apiUrl = computed(() => {
    if (!questionId.value || !editableCourseId.value) return ''
    return `/api/lms/questions/show?course_id=${editableCourseId.value}&cid=${questionId.value}`
})

const { data: question, pending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
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
