<template>
    <div class="aigenerator-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <!-- 顶部标题栏 + 导航 -->
        <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 bg-purple-50 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1">
                <UIcon name="i-lucide-sparkles" class="text-xs" />
                {{ typeLabel[currentQuestion?.type] || t('ueditor.aigenerator') }}
            </span>
            <span v-if="currentQuestion" class="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {{ currentQuestion.name }}
            </span>
            <!-- 导航指示器 -->
            <div v-if="questions.length > 0" class="flex items-center gap-1 ml-auto text-xs text-gray-500">
                <UButton icon="i-lucide-chevron-left" variant="ghost" size="2xs" :disabled="currentIndex <= 0"
                    @click="goPrev" />
                <span class="font-mono px-1">{{ currentIndex + 1 }} / {{ questions.length }}</span>
                <UButton icon="i-lucide-chevron-right" variant="ghost" size="2xs" :disabled="generating"
                    @click="goNext" />
            </div>
        </div>

        <!-- 加载中 -->
        <div v-if="generating && !currentQuestion" class="flex items-center justify-center py-12 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin mr-2" />
            <span>{{ t('ueditor.aigeneratorLoading') }}</span>
        </div>

        <!-- 未开始：显示 Start 按钮 -->
        <div v-else-if="!started && !currentQuestion"
            class="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
            <UIcon name="i-lucide-sparkles" class="size-10 text-purple-500" />
            <p class="text-sm">{{ t('ueditor.aigeneratorStartHint') }}</p>
            <UButton icon="i-lucide-play" color="primary" size="md" :disabled="!isLoggedIn"
                @click="onStart">
                {{ t('ueditor.aigeneratorStart') }}
            </UButton>
        </div>

        <!-- 未登录提示 -->
        <div v-else-if="!isLoggedIn && !currentQuestion" class="flex items-center justify-center py-12 text-gray-400 text-sm">
            <UIcon name="i-lucide-log-in" class="mr-2" />
            <span>{{ t('common.loginRequired') }}</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="genError" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <UIcon name="i-lucide-alert-circle" class="shrink-0 mt-0.5" />
            <div class="flex-1">
                <div>{{ genError }}</div>
                <UButton size="xs" variant="soft" color="primary" class="mt-2" @click="retry">
                    {{ t('common.retry') }}
                </UButton>
            </div>
        </div>

        <!-- 题目内容 -->
        <template v-if="currentQuestion">
            <!-- 题干（html/composite 题型由组件内部处理） -->
            <div v-if="currentQuestion.type !== 'html' && currentQuestion.type !== 'composite'"
                class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="currentQuestion.content" />
            </div>

            <!-- 题型特定渲染 -->
            <component v-if="renderComponent" ref="renderRef" :is="renderComponent" :key="currentIndex"
                :question="currentQuestion" :question-id="0" />

            <!-- 提交/重置 -->
            <div class="flex items-center gap-2 pt-3">
                <div class="flex gap-2 ml-auto">
                    <UButton variant="soft" size="sm" :disabled="!hasAnswer || generating"
                        @click="onReset">
                        {{ t('common.reset') }}
                    </UButton>
                    <UButton color="primary" size="sm" :disabled="!hasAnswer || generating"
                        @click="onSubmit">
                        {{ t('question.submit') }}
                    </UButton>
                </div>
            </div>

            <!-- 结果 -->
            <div v-if="submitted" class="mt-4 space-y-3">
                <ResultBanner :correct="isCorrect" :point="currentQuestion?.point" />
                <template v-if="isCorrect">
                    <div class="mb-2">
                        <span class="text-sm text-gray-500">{{ t('question.correctAnswerLabel') }}</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                            <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                                class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                                <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                            </div>
                        </div>
                    </div>
                    <ExplanationBlock :explanation="currentQuestion?.explanation" />
                </template>
            </div>

            <!-- 显示答案（仅教师可见） -->
            <div v-if="isTeacher" class="mt-4 flex items-start gap-2">
                <UButton variant="soft" size="sm" @click="onShowAnswer">
                    {{ showAnswer ? t('question.hideAnswer') : t('question.showAnswer') }}
                </UButton>
                <div v-if="showAnswer" class="flex-1">
                    <div class="mb-2">
                        <span class="text-sm text-gray-500">{{ t('question.correctAnswerLabel') }}</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                            <div v-for="(ans, idx) in formattedAnswers" :key="idx"
                                class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-sm">
                                <span class="font-medium text-green-700 dark:text-green-300">{{ ans }}</span>
                            </div>
                        </div>
                    </div>
                    <ExplanationBlock v-if="currentQuestion?.explanation" :explanation="currentQuestion?.explanation" />
                </div>
            </div>

            <!-- 底部操作：重新生成 + 下一题 -->
            <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <UButton icon="i-lucide-refresh-cw" variant="ghost" size="xs" :disabled="generating"
                    @click="regenerate">
                    {{ t('ueditor.aigeneratorRegenerate') }}
                </UButton>
                <UButton icon="i-lucide-arrow-right" variant="soft" color="primary" size="xs" class="ml-auto"
                    :disabled="generating" :loading="generating" @click="goNext">
                    {{ t('ueditor.aigeneratorNext') }}
                </UButton>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, provide, watch, onMounted } from 'vue'
import SingleRender from '../../render/vue/question/single.vue'
import JudgeRender from '../../render/vue/question/judge.vue'
import MultipleRender from '../../render/vue/question/multiple.vue'
import FillRender from '../../render/vue/question/fill.vue'
import SelectRender from '../../render/vue/question/select.vue'
import SortRender from '../../render/vue/question/sort.vue'
import ClassifyRender from '../../render/vue/question/classify.vue'
import ShortAnswerRender from '../../render/vue/question/short-answer.vue'
import MatchRender from '../../render/vue/question/match.vue'
import ResultBanner from '../../render/vue/question/result-banner.vue'
import ExplanationBlock from '../../render/vue/question/explanation-block.vue'
import { computeCorrectRate } from '../../render/vue/question/shared.ts'
import questionPrompt from '../../../../../../question_prompt.md?raw'

const props = defineProps({
    node: Object,
})

const { t } = useI18n()
const { editableCourseId, editableId } = useLayoutState()
const { hasRole, user } = useAuth()
const chapterTask = useChapterTask()
const toast = useToast()

const isLoggedIn = computed(() => !!user.value)
const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch { /* noop */ }
    return {}
})

const typeLabel = computed(() => ({
    single: t('question.typeSingle'),
    judge: t('question.typeJudge'),
    multiple: t('question.typeMultiple'),
    fill: t('question.typeFill'),
    select: t('question.typeSelect'),
    sort: t('question.typeSort'),
    classify: t('question.typeClassify'),
    'short-answer': t('question.typeShortAnswer'),
    match: t('question.typeMatch'),
}))

// 题型 → 渲染组件（aigenerator 不支持 puzzle/html/composite）
const componentMap = {
    single: SingleRender, judge: JudgeRender, multiple: MultipleRender,
    fill: FillRender, select: SelectRender, sort: SortRender,
    classify: ClassifyRender, 'short-answer': ShortAnswerRender, match: MatchRender,
}
const renderComponent = computed(() => componentMap[currentQuestion.value?.type] || null)
const renderRef = ref(null)

// ====================== 状态 ======================
const questions = ref([])
const currentIndex = ref(0)
const generating = ref(false)
const genError = ref('')
// 是否已点击 Start（未点击前不自动生题）
const started = ref(false)

// 预生成 promise（非响应式，避免触发 watch）
let nextPromise = null

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

// 公共状态（provide 给子组件）
const submitted = ref(false)
const isCorrect = ref(false)
const fromRecord = ref(false)
const showAnswer = ref(false)

provide('questionSubmitted', submitted)
provide('questionIsCorrect', isCorrect)
provide('questionFromRecord', fromRecord)
provide('questionData', currentQuestion)
provide('inQuiz', false)
provide('inQuestion', true)

const hasAnswer = computed(() => renderRef.value?.hasAnswer ?? false)

// ====================== LLM 出题 ======================

/**
 * 构建系统提示词：注入 question_prompt.md 规则 + 当前题型要求
 */
function buildSystemPrompt() {
    const type = config.value.questionType || 'single'
    const label = typeLabel.value[type] || type
    return `你是一个专业的出题专家。请严格遵循以下出题规则生成题目。

出题规则与各题型 JSON 格式说明：

${questionPrompt}

当前出题要求：
- 题型固定为 "${type}"（${label}）
- 只输出一个完整的 JSON 对象，不要包含任何解释性文字
- 不要使用 markdown 代码块标记（不要用 \`\`\`json 和 \`\`\`）
- 确保 answer 字段与题目逻辑一致且正确
- content 字段使用纯文本字符串
- type 字段必须为 "${type}"`
}

/**
 * 调用 /api/aichat/chat 生成一道题目（SSE 流式），返回解析后的 question 对象
 */
async function generateQuestion() {
    const cfg = config.value
    const type = cfg.questionType || 'single'
    const refText = cfg.referenceText || ''
    const model = cfg.model || 'glm-4.5-air'
    const thinking = cfg.thinking || false

    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `请生成一道${typeLabel.value[type] || type}题目。${refText ? `参考文本：\n${refText}` : '请自行选择相关知识点出题。'}` },
    ]

    const response = await fetch('/api/aichat/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, thinking }),
    })

    // 非流式响应 = 错误（cResp 返回 JSON）
    const contentType = response.headers.get('Content-Type') || ''
    if (!contentType.includes('text/event-stream')) {
        let msg = t('ueditor.aigeneratorFailed')
        try {
            const data = await response.json()
            msg = data.msg || msg
        } catch { /* noop */ }
        throw new Error(msg)
    }

    // 解析 SSE 流，拼接完整 content
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') continue
            try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content || ''
                fullContent += delta
            } catch { /* skip malformed chunk */ }
        }
    }

    return parseQuestionJson(fullContent, type)
}

/**
 * 解析 LLM 返回的 JSON 题目，容错处理（去 markdown 标记、提取 JSON、补全字段）
 */
function parseQuestionJson(text, expectedType) {
    let cleaned = text.trim()
    // 去除 markdown 代码块标记
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
    }
    // 提取第一个 { 到最后一个 } 之间的内容
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
    }
    const q = JSON.parse(cleaned)
    // 强制题型为配置的题型
    q.type = expectedType
    // 补全字段
    q.record = []
    q.correct_rate = 0
    q.point = q.point || config.value.point || 1
    q.name = q.name || `Q${questions.value.length + 1}`
    if (!Array.isArray(q.options)) q.options = q.options || []
    if (!Array.isArray(q.answer)) q.answer = q.answer || []
    if (!Array.isArray(q.tags)) q.tags = q.tags || []
    return q
}

/**
 * 确保 nextPromise 存在（后台预生成下一题），返回该 promise
 */
function ensureNextQuestion() {
    if (!nextPromise) {
        nextPromise = generateQuestion().catch((err) => {
            nextPromise = null
            throw err
        })
    }
    return nextPromise
}

/**
 * 生成一道新题并追加到 questions，切换 currentIndex，并预生成下一题
 */
async function startGeneration() {
    generating.value = true
    genError.value = ''
    try {
        const q = await ensureNextQuestion()
        nextPromise = null
        q.submitted = false
        q.isCorrect = false
        questions.value.push(q)
        currentIndex.value = questions.value.length - 1
        // 预生成下一题（fire and forget）
        ensureNextQuestion()
    } catch (err) {
        genError.value = err.message || t('ueditor.aigeneratorFailed')
        nextPromise = null
    } finally {
        generating.value = false
    }
}

/**
 * 切换到下一题：已有则直接切换，否则生成新题
 */
async function goNext() {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++
        return
    }
    await startGeneration()
}

/**
 * 切换到上一题
 */
function goPrev() {
    if (currentIndex.value > 0) {
        currentIndex.value--
    }
}

/**
 * 重新生成当前题（替换）
 */
async function regenerate() {
    if (generating.value) return
    generating.value = true
    genError.value = ''
    try {
        const q = await generateQuestion()
        q.submitted = false
        q.isCorrect = false
        // 替换当前题
        questions.value[currentIndex.value] = q
        // 重置 UI 状态
        submitted.value = false
        isCorrect.value = false
        fromRecord.value = false
        showAnswer.value = false
    } catch (err) {
        genError.value = err.message || t('ueditor.aigeneratorFailed')
    } finally {
        generating.value = false
    }
}

/**
 * 重试（出错时）
 */
async function retry() {
    genError.value = ''
    if (questions.value.length === 0) {
        await startGeneration()
    } else {
        await regenerate()
    }
}

// ====================== 切换题目时同步 per-question 状态 ======================
watch(currentIndex, () => {
    const q = currentQuestion.value
    submitted.value = q?.submitted || false
    isCorrect.value = q?.isCorrect || false
    fromRecord.value = false
    showAnswer.value = false
})

// ====================== 提交 / 重置 ======================

// 格式化答案显示（同 question.vue）
const formattedAnswers = computed(() => {
    const q = currentQuestion.value
    if (!q?.answer) return []
    const answer = q.answer
    const type = q.type

    if (type === 'single' || type === 'multiple') {
        return answer.map(idx => String.fromCharCode(65 + idx))
    } else if (type === 'judge') {
        return answer.map(idx => idx === 0 ? t('question.correct') : t('question.wrong'))
    } else if (type === 'sort') {
        const options = q.options || []
        return answer.map(idx => options[idx] || `#${idx}`)
    } else if (type === 'classify') {
        const options = q.options || []
        return options.map((cat, ci) => {
            const items = (cat.items || []).join(', ')
            return `${cat.name || `#${ci + 1}`}: ${items}`
        })
    } else if (type === 'short-answer') {
        return [`${t('question.shortAnswerRegex')}: ${answer[0] || ''}`]
    } else if (type === 'match') {
        const options = q.options || []
        return options.map(pair => `${pair.left} ↔ ${pair.right}`)
    } else {
        const options = q.options || []
        return answer.map((ans, idx) => options[idx] === 'regex' ? `${ans} (${t('question.fillRegex')})` : String(ans))
    }
})

async function onSubmit() {
    if (!isLoggedIn.value) {
        toast.add({ title: t('common.loginRequired'), color: 'warning' })
        return
    }
    if (!renderRef.value || !currentQuestion.value) return

    const qData = currentQuestion.value
    const rate = computeCorrectRate(qData)
    isCorrect.value = rate > 0
    submitted.value = true
    fromRecord.value = false

    // 存储每题状态（切换时恢复）
    qData.submitted = true
    qData.isCorrect = isCorrect.value
    qData.correct_rate = rate

    // 上报章节任务完成状态（使用 index 作为 cid 避免冲突）
    chapterTask?.reportNodeDone('aigenerator', currentIndex.value + 1, isCorrect.value)

    // 记录积分到 user_chapter / user_courses（不记录 user_question）
    try {
        await cRequest('/api/aichat/award', {
            method: 'POST',
            body: {
                course_id: editableCourseId.value,
                chapter_id: editableId.value,
                correct_rate: rate,
                point: qData.point || config.value.point || 1,
            },
        })
        useUserCard().refresh()
    } catch {
        // 静默忽略（网络错误）
    }
}

function onReset() {
    if (!renderRef.value) return
    renderRef.value.reset()
    submitted.value = false
    isCorrect.value = false
    showAnswer.value = false
    fromRecord.value = false
    const q = currentQuestion.value
    if (q) {
        q.submitted = false
        q.isCorrect = false
        q.record = []
    }
}

function onShowAnswer() {
    showAnswer.value = !showAnswer.value
    if (showAnswer.value && renderRef.value) {
        renderRef.value.fillCorrectAnswer()
    } else {
        onReset()
    }
}

// ====================== Start 触发 ======================

/**
 * 用户点击 Start 后开始生题（首次/重新开始均调用此函数）
 */
async function onStart() {
    if (!isLoggedIn.value) {
        toast.add({ title: t('common.loginRequired'), color: 'warning' })
        return
    }
    if (generating.value) return
    started.value = true
    await startGeneration()
}

// ====================== 自动生成首题 ======================
// 已改为：必须用户点击 Start 按钮才生题，不再 onMounted 自动触发
onMounted(() => {
    if (!import.meta.client) return
    // 保留可扩展点：未来可在此检查章节任务/缓存恢复
})
</script>

<style scoped>
.aigenerator-render {
    width: 100%;
}
</style>
