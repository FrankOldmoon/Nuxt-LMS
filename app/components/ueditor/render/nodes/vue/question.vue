<template>
    <div class="question-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-question-id="questionId"
        @mouseenter.once="onHover">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('question.loading') }}</span>
        </div>

        <!-- 题目未找到 -->
        <div v-else-if="!question" class="text-center py-6 text-gray-400">
            {{ $t('question.notFound') }} (cid: {{ questionId }})
        </div>

        <template v-else>
            <!-- {{ question.record }}:{{ question.correct_rate }} -->
            <!-- {{ question }} -->
            <!-- 右上角编辑按钮 -->
            <div class="absolute top-2 right-2 flex items-center gap-1 z-10">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                    class="opacity-50 hover:opacity-100 transition-opacity"
                    @click="editOpen = true" />
            </div>

            <!-- 题目标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span
                    class="px-2 py-0.5 bg-blue-50 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                    {{ typeLabel[question.type] }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ question.name }}</span>
                <span v-if="questionId" class="text-xs text-gray-400">#{{ questionId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400 font-mono">{{ scoreDisplay }}</span>
                </div>
            </div>

            <!-- 题目内容（html/composite 题型由组件内部处理） -->
            <div v-if="question?.type !== 'html' && question?.type !== 'composite'" class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="question.content" />
            </div>

            <!-- 题型特定渲染 -->
            <component v-if="renderComponent" ref="renderRef" :is="renderComponent" :question="question"
                :question-id="questionId" />
        </template>

        <!-- 提交/重置（公共，quiz 模式下隐藏） -->
        <div v-if="question && !inQuiz" class="flex items-center gap-2 pt-3">
            <!-- 标签 -->
            <div v-if="question.tags && question.tags.length" class="flex flex-wrap gap-1">
                <span v-for="(tag, idx) in question.tags" :key="idx"
                    class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                    {{ tag }}
                </span>
            </div>
            <div class="flex gap-2 ml-auto">
                <UButton variant="soft" size="sm" :disabled="!hasAnswer" @click="onReset">
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
            <!-- 答案正确才显示正确答案和解析 -->
            <template v-if="isCorrect">
                <div class="mb-2">
                    <span class="text-sm text-gray-500">{{ $t('question.correctAnswerLabel') }}</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                        <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                            class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                            <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                        </div>
                    </div>
                </div>
                <ExplanationBlock :explanation="question?.explanation" />
            </template>
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

        <!-- 记录弹窗（仅教师） -->
        <RecordsModal v-if="isTeacher" v-model="recordsOpen" :course-id="editableCourseId"
            :cid="questionId" :question="question" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, provide, inject, watch } from 'vue'
import SingleRender from './question/single.vue'
import JudgeRender from './question/judge.vue'
import MultipleRender from './question/multiple.vue'
import FillRender from './question/fill.vue'
import SelectRender from './question/select.vue'
import SortRender from './question/sort.vue'
import ClassifyRender from './question/classify.vue'
import PuzzleRender from './question/puzzle.vue'
import HtmlRender from './question/html.vue'
import ShortAnswerRender from './question/short-answer.vue'
import MatchRender from './question/match.vue'
import CompositeRender from './question/composite.vue'
import ResultBanner from './question/result-banner.vue'
import ExplanationBlock from './question/explanation-block.vue'
import QuestionEdit from '../../../extensions/nodes/vue/question/edit.vue'
import RecordsModal from './question/records-modal.vue'
import { computeCorrectRate, decryptAnswer } from './question/shared.ts'

const props = defineProps({
    node: Object,
    inQuiz: { type: Boolean, default: false },
})

// race 模式：显示提交按钮但不向后端提交 question 记录
const inRace = inject('inRace', false)

const emit = defineEmits(['init'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const { hasRole } = useAuth()
const chapterTask = useChapterTask()

const questionId = computed(() => Number(props.node?.attrs?.content) || 0)

const typeLabel = computed(() => ({
    single: t('question.typeSingle'),
    judge: t('question.typeJudge'),
    multiple: t('question.typeMultiple'),
    fill: t('question.typeFill'),
    select: t('question.typeSelect'),
    sort: t('question.typeSort'),
    classify: t('question.typeClassify'),
    puzzle: t('question.typePuzzle'),
    html: t('question.typeHtml'),
    'short-answer': t('question.typeShortAnswer'),
    match: t('question.typeMatch'),
    composite: t('question.typeComposite'),
}))

// 题型 → 渲染组件
const componentMap = { single: SingleRender, judge: JudgeRender, multiple: MultipleRender, fill: FillRender, select: SelectRender, sort: SortRender, classify: ClassifyRender, puzzle: PuzzleRender, html: HtmlRender, 'short-answer': ShortAnswerRender, match: MatchRender, composite: CompositeRender }
const renderComponent = computed(() => componentMap[question.value?.type] || null)
const renderRef = ref(null)

// 公共状态
const submitted = ref(false)
const isCorrect = ref(false)
const showAnswer = ref(false)
// 标记是否来自 fetchRecord 回填（回填时可重新作答，submit 后不可）
const fromRecord = ref(false)

// provide 给子组件，让子组件能感知提交状态（如禁用选项、样式变化）
provide('questionSubmitted', submitted)
provide('questionIsCorrect', isCorrect)
provide('questionFromRecord', fromRecord)

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
    } else if (type === 'sort') {
        // 排序题：显示正确顺序的选项文本
        const options = question.value.options || []
        return answer.map(idx => options[idx] || `#${idx}`)
    } else if (type === 'classify') {
        // 分类题：显示每个分类及其正确项
        const options = question.value.options || []
        return options.map((cat, ci) => {
            const items = (cat.items || []).join(', ')
            return `${cat.name || `#${ci + 1}`}: ${items}`
        })
    } else if (type === 'puzzle') {
        // 拼图题：显示原图排列
        return [t('question.puzzleOriginalImage')]
    } else if (type === 'html') {
        // HTML 题：由 iframe 判定
        return [t('question.htmlDeterminedByIframe')]
    } else if (type === 'short-answer') {
        // 简答题：显示正则表达式
        return [`${t('question.shortAnswerRegex')}: ${answer[0] || ''}`]
    } else if (type === 'match') {
        // 连线题：显示正确配对
        const options = question.value.options || []
        return options.map((pair, i) => `${pair.left} ↔ ${pair.right}`)
    } else if (type === 'composite') {
        // 大题：显示子题数量
        const subs = Array.isArray(question.value.content) ? question.value.content : []
        return [t('question.compositeSubCount', { count: subs.length })]
    } else {
        // 填空题/下拉题：直接显示答案文本，正则答案加标记
        const options = question.value.options || []
        return answer.map((ans, idx) => options[idx] === 'regex' ? `${ans} (${t('question.fillRegex')})` : String(ans))
    }
})

function onSubmit() {
    if (!renderRef.value) return
    if (inRace) {
        // race 模式：只显示结果，不向后端提交（race 的提交检测会自动处理）
        const qData = question.value
        if (Array.isArray(qData.answer) && qData.answer.some((a) => typeof a === 'string' && a.startsWith('enc:'))) {
            qData.answer = decryptAnswer(qData.answer)
        }
        const rate = computeCorrectRate(qData)
        isCorrect.value = rate > 0
        submitted.value = true
        fromRecord.value = false
        return
    }
    const result = renderRef.value.submit()
    if (result) {
        isCorrect.value = result.isCorrect
        submitted.value = true
        fromRecord.value = false
        // 上报题目完成状态（quiz 模式下由 quiz 统一上报）
        if (!props.inQuiz) {
            chapterTask?.reportNodeDone('question', questionId.value, isCorrect.value)
        }
    }
}

function onReset() {
    if (!renderRef.value) return
    renderRef.value.reset()
    submitted.value = false
    isCorrect.value = false
    showAnswer.value = false
    fromRecord.value = false
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

// 默认单选题（questionId 为空时填充，便于新建）
const defaultQuestion = reactive({
    name: '',
    content: '',
    options: ['', '', '', ''],
    type: 'single',
    point: 1,
    answer: [0],
    explanation: '',
    tags: [],
    record: [],
    correct_rate: 0,
})

// SSR-friendly data fetching
const apiUrl = computed(() => {
    if (!questionId.value || !editableCourseId.value) return ''
    return `/api/lms/questions/show?course_id=${editableCourseId.value}&cid=${questionId.value}`
})

const { data: fetchedQuestion, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        // 注意：answer 在此保持加密状态，不在 SSR payload 中暴露明文
        // 解密在客户端 watch 中执行（见下方 onMounted / watch）
        return reactive({
            name: raw.name || '',
            content: Array.isArray(raw.content) ? JSON.parse(JSON.stringify(raw.content)) : (raw.content || ''),
            options: raw.options != null ? JSON.parse(JSON.stringify(raw.options)) : [],
            type: raw.type || 'single',
            point: Number(raw.point) || 0,
            answer: Array.isArray(raw.answer) ? [...raw.answer] : [],
            explanation: raw.explanation || '',
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            record: Array.isArray(raw.record) ? JSON.parse(JSON.stringify(raw.record)) : [],
            correct_rate: 0,
        })
    },
})

// questionId 为空时使用默认单选题；否则使用接口数据
// flush: 'sync' 确保 SSR 渲染时数据到达后同步更新，避免用 defaultQuestion 渲染
const question = ref(defaultQuestion)
watch([fetchedQuestion, questionId], () => {
    if (!questionId.value) {
        question.value = defaultQuestion
    } else if (fetchedQuestion.value) {
        // 客户端解密 answer（SSR 时保持加密，避免明文暴露在 payload 中）
        const q = fetchedQuestion.value
        if (import.meta.client && Array.isArray(q.answer) && q.answer.some((a) => typeof a === 'string' && a.startsWith('enc:'))) {
            q.answer = decryptAnswer(q.answer)
        }
        question.value = q
    }
}, { immediate: true, flush: 'sync' })

// provide question 数据，供 select 渲染节点获取 options
provide('questionData', question)
// 告知深层子组件（如 code-block）当前在 question/quiz 中，隐藏运行/复制按钮
provide('inQuiz', props.inQuiz)
provide('inQuestion', true)

// questionId 为空时不显示加载态
const pending = computed(() => !!questionId.value && fetchedPending.value)

// 根据 record 实时更新 correct_rate（得分比 0~1）
watch(() => question.value?.record, () => {
    if (question.value) {
        question.value.correct_rate = computeCorrectRate(question.value)
    }
}, { immediate: true, deep: true })

// 得分显示 [obtained/point]，仅在 submit 后更新
const scoreDisplay = computed(() => {
    if (!question.value) return '[0/0]'
    const total = question.value.point || 0
    const rate = submitted.value ? (question.value.correct_rate || 0) : 0
    const obt = rate * total
    const fmt = (n) => Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)))
    return `[${fmt(obt)}/${fmt(total)}]`
})

const editOpen = ref(false)
const recordsOpen = ref(false)

function onSaved(ques) {
    // 新建题目：拿到新增 cid 后通知父节点更新 content 属性
    if (ques.cid && Number(ques.cid) !== questionId.value) {
        emit('init', ques.cid)
    } else {
        // 已有题目：刷新接口数据
        refresh()
    }
    // 本地立即更新内容，避免刷新期间空白
    if (question.value) {
        Object.assign(question.value, ques)
    }
}

// 鼠标移入时（仅一次）：非 quiz/race 模式获取当前用户的提交记录
function onHover() {
    if (props.inQuiz || inRace) return
    fetchRecord()
}
async function fetchRecord() {
    if (!questionId.value || !editableCourseId.value) return
    try {
        const data = await cRequest(`/api/lms/questions/record?course_id=${editableCourseId.value}&cid=${questionId.value}`)
        if (data && question.value) {
            // records 只存最新一次作答，直接填充
            if (Array.isArray(data.records) && data.records.length > 0) {
                question.value.record = [...data.records]
                // 同步计算 correct_rate（watch 是异步的，此处手动算避免读到旧值）
                question.value.correct_rate = computeCorrectRate(question.value)
                // 有历史记录则显示结果（不重新提交），但允许重新作答
                submitted.value = true
                fromRecord.value = true
                isCorrect.value = (question.value.correct_rate || 0) > 0
                // 上报历史完成状态
                chapterTask?.reportNodeDone('question', questionId.value, isCorrect.value)
            }
        }
    } catch (err) {
        // 静默忽略（未登录或无记录）
    }
}

// ====================== 暴露给 quiz 的方法 ======================
defineExpose({
    // 获取当前 question 数据（quiz 用于 computeCorrectRate）
    getQuestionData() {
        return question.value
    },
    // 从 quiz record 填充（不提交后端）
    fillFromRecord(record, rate) {
        if (question.value && Array.isArray(record)) {
            question.value.record = [...record]
            question.value.correct_rate = rate !== undefined ? rate : computeCorrectRate(question.value)
            submitted.value = true
            fromRecord.value = true
            isCorrect.value = (question.value.correct_rate || 0) > 0
        }
    },
    // 显示结果（不提交后端，quiz submit 时调用）
    showResult() {
        if (!question.value) return { rate: 0, record: [] }
        // 确保 answer 已解密（防止 SSR 遗留的加密状态）
        if (Array.isArray(question.value.answer) && question.value.answer.some((a) => typeof a === 'string' && a.startsWith('enc:'))) {
            question.value.answer = decryptAnswer(question.value.answer)
        }
        const rate = computeCorrectRate(question.value)
        question.value.correct_rate = rate
        submitted.value = true
        fromRecord.value = false
        isCorrect.value = rate > 0
        return {
            rate,
            record: question.value.record ? [...question.value.record] : [],
        }
    },
    // 重置（quiz 重试时调用）
    resetForQuiz() {
        if (renderRef.value) renderRef.value.reset()
        submitted.value = false
        isCorrect.value = false
        fromRecord.value = false
        showAnswer.value = false
        if (question.value) question.value.record = []
    },
    // 是否有答案
    get hasAnswer() {
        return renderRef.value?.hasAnswer ?? false
    },
})
</script>

<style scoped>
.question-render {
    width: 100%;
}
</style>
