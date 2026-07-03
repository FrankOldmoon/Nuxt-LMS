<template>
    <div>
        <!-- HTML 预览 iframe -->
        <div class="border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
            <iframe ref="iframeRef" :srcdoc="htmlContent" sandbox="allow-scripts" class="w-full"
                style="min-height: 300px; border: 0;" />
        </div>

        <!-- 正确率提示（提交后显示） -->
        <div v-if="submitted && latestRate !== null" class="mt-2 text-xs text-gray-500">
            {{ $t('question.htmlCorrectRate') }}: {{ Math.round(latestRate * 100) }}%
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()

const iframeRef = ref(null)

// HTML 内容
const htmlContent = computed(() => {
    const c = props.question.content
    if (typeof c === 'string') return c
    return ''
})

// iframe 传来的正确率
const latestRate = ref(null)

const hasAnswer = computed(() => latestRate.value !== null)

// 监听 iframe message
function onMessage(event) {
    if (event.data && typeof event.data === 'object' && event.data.type === 'correct_rate') {
        const rate = Number(event.data.rate)
        if (!isNaN(rate) && rate >= 0 && rate <= 1) {
            latestRate.value = rate
            if (submitted.value) {
                submitted.value = false
            }
            if (fromRecord.value) {
                fromRecord.value = false
            }
            // 实时记录到 record
            recordAnswer(props.question, [rate])
        }
    }
}

onMounted(() => {
    window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
})

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    const rate = Number(record[0])
    if (!isNaN(rate)) {
        latestRate.value = rate
    }
}, { immediate: true })

function submit() {
    if (!props.question) return
    const rate = latestRate.value ?? 0
    const correct = rate >= 1
    isCorrect.value = correct
    submitQuestion({
        questionId: props.questionId,
        userAnswer: [rate],
        isCorrect: correct,
        correctRate: rate,
        courseId: editableCourseId.value,
        chapterId: editableId.value,
        point: props.question.point,
    })
    return { isCorrect: correct }
}

function reset() {
    latestRate.value = null
    props.question.record = []
}

function fillCorrectAnswer() {
    // HTML 题无法自动填充正确答案
    latestRate.value = 1
    recordAnswer(props.question, [1])
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
