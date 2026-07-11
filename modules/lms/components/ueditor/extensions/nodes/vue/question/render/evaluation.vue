<template>
    <div class="space-y-4">
        <!-- 评价目标 + 进度条 -->
        <div class="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-target" class="size-5 text-primary" />
                <span class="font-semibold text-highlighted">{{ goal }}</span>
            </div>
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-muted">{{ $t('question.evaluationProgress') }}</span>
                <span class="text-xs font-semibold" :class="passed ? 'text-success' : 'text-primary'">
                    {{ Math.round(progress * 100) }}%
                </span>
            </div>
            <UProgress :modelValue="progress * 100" />
            <p v-if="passed" class="text-xs text-success mt-2 flex items-center gap-1">
                <UIcon name="i-lucide-check-circle" class="size-3.5" />
                {{ $t('question.evaluationPassed') }}
            </p>
            <p v-else-if="progress > 0" class="text-xs text-muted mt-2">
                {{ $t('question.evaluationNotPassed', { threshold: Math.round(threshold * 100) }) }}
            </p>
        </div>

        <!-- AI 对话评估（AI 生成的题目由 ueditorRender 直接内联渲染） -->
        <AiChatbox
            ref="chatboxRef"
            :title="$t('question.evaluationChatTitle')"
            :preset="systemPrompt"
            :opening="openingMessage"
            :enable-voice-input="true"
            :enable-voice-output="true"
            height-class="h-[400px]"
        />
    </div>
</template>

<script setup>
import { ref, computed, inject, provide, nextTick, onMounted } from 'vue'
import { submitQuestion, recordAnswer } from './shared.ts'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()
const { t } = useI18n()

// ── 评价配置 ──
const goal = computed(() => props.question?.options?.goal || '')
const threshold = computed(() => {
    const v = props.question?.options?.threshold
    return (typeof v === 'number' && v > 0 && v <= 1) ? v : 0.8
})

// ── 进度模型：每答对一题增加 STEP 进度，5 题即 100% ──
const STEP = 0.2

// ── 状态 ──
const chatboxRef = ref(null)
const correctCount = ref(0)   // 答对题数
const answeredCount = ref(0)  // 已答题数（含答错）
const answeredQuestions = ref(new Set())  // 已答题名集合（防重复计数）

// 进度由本地答对题数计算，不由 AI 控制
const progress = computed(() => Math.min(1, correctCount.value * STEP))
const passed = computed(() => progress.value >= threshold.value)

// ── hasAnswer：已答过至少一题即可提交 ──
const hasAnswer = computed(() => answeredCount.value > 0)

// ── provide：供 ueditorRender 内联渲染的 QuestionRender 回传答题结果 ──
// provide/inject 穿透 AiChatbox → ueditorRender → render/nodes/vue.vue → QuestionRender
function onEvaluationAnswered({ isCorrect: correct, question: q }) {
    const qKey = q?.name || ''
    if (answeredQuestions.value.has(qKey)) return
    answeredQuestions.value.add(qKey)

    answeredCount.value++
    if (correct) correctCount.value++

    // 发送答题结果给 LLM，LLM 据此决定后续对话
    const feedback = `[Question Result] Type: ${q?.type || ''} | Name: "${qKey}" | Correct: ${correct}`
    chatboxRef.value?.send(feedback)
    // 仅在答题时保存完整聊天记录并提交后端
    saveAndSubmit()
}
provide('onEvaluationAnswered', onEvaluationAnswered)

// ── 系统提示词 ──
const systemPrompt = computed(() => `You are an AI evaluation tutor. The evaluation goal is: "${goal.value}"

Your task is to assess the user's mastery of this goal through conversation and interactive questions.

## How to generate interactive questions

When you want to test the user with an interactive question, output it in this exact format:

\`\`\`question
{
  "type": "single",
  "name": "Question title",
  "content": "Question text (supports markdown)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": [0],
  "point": 1,
  "explanation": "Explanation text"
}
\`\`\`

Supported question types and their formats:
- single: options=["A","B","C","D"], answer=[correctIndex]
- judge: options=["Correct","Wrong"], answer=[0 or 1]
- multiple: options=["A","B","C","D"], answer=[0,2] (multiple correct indices)
- fill: options=[], answer=["answer1","answer2"] (answers correspond to {0},{1} placeholders in content)
- short-answer: options=[], answer=["regex pattern"], content="Question text"
- select: options=[["opt1","opt2"],["opt3","opt4"]], answer=[0,1] (each option array is a dropdown, answer is selected index)
- sort: options=["item1","item2","item3"], answer=[0,1,2] (correct order indices)
- match: options=[{"left":"A","right":"1"},{"left":"B","right":"2"}], answer=[0,1]
- classify: options=[{"name":"Cat1","items":["a","b"]},{"name":"Cat2","items":["c"]}], answer=[0,0,1]

## Guidelines

- Start with easy questions and gradually increase difficulty
- Cover different aspects of the evaluation goal
- Ask ONE question at a time
- If the user answers incorrectly, explain the correct answer before moving on
- Provide constructive, specific feedback
- Be encouraging but honest about areas needing improvement
- Use the same language as the user
- When the user answers an interactive question, you will receive feedback like: "[Question Result] Type: single | Name: ... | Correct: true"
- Use this feedback to decide what to ask next
- Do NOT repeat the question JSON in your conversational text - the question block will be rendered as an interactive component inline
- Keep your conversational text concise when generating a question`)

// ── 开场消息 ──
const openingMessage = computed(() =>
    t('question.evaluationOpening', { goal: goal.value })
)

// ── 保存并提交：仅在答题时调用，保存完整聊天记录到 question.record 并提交后端 ──
function saveAndSubmit() {
    if (!import.meta.client) return
    const messages = chatboxRef.value?.getMessages() || []
    const recordData = {
        correctCount: correctCount.value,
        answeredCount: answeredCount.value,
        answeredQuestions: [...answeredQuestions.value],
        progress: progress.value,
        passed: passed.value,
        messages: messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            reasoning: m.reasoning || '',
        })),
    }
    // 保存到 props.question.record（供 computeCorrectRate 等使用）
    recordAnswer(props.question, [recordData])
    // 提交到后端（持久化，之后可从远程恢复）
    submitQuestion({
        questionId: props.questionId,
        userAnswer: [recordData],
        isCorrect: passed.value,
        correctRate: progress.value,
        courseId: courseId.value,
        chapterId: chapterId.value,
        point: props.question?.point,
    })
}

// ── 从 record 恢复状态 ──
function restoreFromRecord() {
    const record = Array.isArray(props.question?.record) && props.question.record.length > 0
        ? props.question.record[0]
        : null
    if (!record || typeof record !== 'object') return

    correctCount.value = Math.max(0, Number(record.correctCount) || 0)
    answeredCount.value = Math.max(0, Number(record.answeredCount) || 0)
    answeredQuestions.value = new Set(Array.isArray(record.answeredQuestions) ? record.answeredQuestions : [])

    // 恢复聊天记录（题目由 ueditorRender 直接渲染，无需恢复 _question 等字段）
    if (Array.isArray(record.messages) && record.messages.length > 0 && chatboxRef.value) {
        chatboxRef.value.clearMessages()
        record.messages.forEach(m => {
            chatboxRef.value.addMessage({
                role: m.role,
                content: m.content,
                reasoning: m.reasoning || '',
            })
        })
    }
}

// ── 从远程获取 record 并恢复 ──
async function fetchAndRestore() {
    const cid = courseId.value
    const qid = props.questionId
    if (!cid || !qid) return
    try {
        const data = await cRequest(`/api/questions/record?course_id=${cid}&cid=${qid}`)
        if (data && Array.isArray(data.records) && data.records.length > 0) {
            props.question.record = [...data.records]
            restoreFromRecord()
        }
    } catch {
        // 静默忽略（未登录或无记录）
    }
}

onMounted(() => {
    if (import.meta.client) {
        nextTick(() => fetchAndRestore())
    }
})

// ── 暴露给父组件的方法 ──
defineExpose({
    submit() {
        const correct = passed.value
        if (submitted) submitted.value = true
        if (isCorrect) isCorrect.value = correct
        if (fromRecord) fromRecord.value = false
        // 保存完整聊天记录并提交后端（含 progress/passed）
        saveAndSubmit()

        return { isCorrect: correct }
    },
    reset() {
        correctCount.value = 0
        answeredCount.value = 0
        answeredQuestions.value = new Set()
        chatboxRef.value?.clearMessages()
        if (props.question) props.question.record = []
        // 重新添加开场消息
        nextTick(() => {
            if (chatboxRef.value && openingMessage.value) {
                chatboxRef.value.addMessage({ role: 'assistant', content: openingMessage.value })
            }
        })
    },
    hasAnswer,
    fillCorrectAnswer() {
        // 教师查看答案：将进度填到刚好通过阈值
        correctCount.value = Math.ceil(threshold.value / STEP)
    },
})
</script>
