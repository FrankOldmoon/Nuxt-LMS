import { ref, computed, provide, inject, watch, onMounted, type InjectionKey } from 'vue'
import { computeCorrectRate } from '../question/render/shared'
import { allPrompts } from '../question/edit/prompts.js'

export interface AiGeneratorRenderProps {
    node?: any
}

type AiGeneratorRenderCtx = ReturnType<typeof useAiGeneratorRender>
export const AiGeneratorRenderKey: InjectionKey<AiGeneratorRenderCtx> = Symbol('AiGeneratorRender')
export function useAiGeneratorRenderContext() {
    const ctx = inject(AiGeneratorRenderKey)
    if (!ctx) throw new Error('useAiGeneratorRenderContext must be used within aigenerator/render.vue')
    return ctx
}

export function useAiGeneratorRender(props: AiGeneratorRenderProps) {
    const { t } = useI18n()
    const { courseId, chapterId } = useLmsContext()
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

    // 题型标签（用于顶部显示）
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

    // ====================== 状态 ======================
    const questions = ref<any[]>([])
    const currentIndex = ref(0)
    const generating = ref(false)
    const genError = ref('')
    // 是否已点击 Start（未点击前不自动生题）
    const started = ref(false)
    const renderRef = ref<any>(null) // QuestionRender 组件引用

    // 预生成 promise（非响应式，避免触发 watch）
    let nextPromise: Promise<any> | null = null

    const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

    // ====================== LLM 出题 ======================

    /**
     * 构建系统提示词：注入各题型 prompt + 当前题型要求
     */
    function buildSystemPrompt() {
        const type = config.value.questionType || 'single'
        const label = typeLabel.value[type] || type
        return `You are a professional question-generation expert. Please strictly follow the rules below to generate a question.

Generation rules and JSON format description for each question type:

${allPrompts()}

Current requirement:
- The question type is fixed to "${type}" (${label})
- Output ONLY one complete JSON object. You may wrap it in a \`\`\`json code block; any prose outside the block will be ignored.
- Make sure the answer field is logically correct and consistent with the question
- The content field should be a plain text string
- The type field must be exactly "${type}"`
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
    function parseQuestionJson(text: string, expectedType: string) {
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
        } catch (err: any) {
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
        } catch (err: any) {
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

    // ====================== QuestionRender 提交回调 ======================

    /**
     * QuestionRender 提交完成回调：记录积分 + 更新题目状态
     */
    async function onSubmitted({ isCorrect }: { isCorrect: boolean; questionId?: number }) {
        if (!currentQuestion.value) return

        const qData = currentQuestion.value
        const rate = computeCorrectRate(qData)

        // 存储每题状态（切换时恢复）
        qData.submitted = true
        qData.isCorrect = isCorrect
        qData.correct_rate = rate

        // 上报章节任务完成状态（使用 index 作为 cid 避免冲突）
        chapterTask?.reportNodeDone('aigenerator', currentIndex.value + 1, isCorrect)

        // 记录积分到 user_chapter / user_courses（不记录 user_question）
        try {
            await cRequest('/api/aichat/award', {
                method: 'POST',
                body: {
                    course_id: courseId.value,
                    chapter_id: chapterId.value,
                    correct_rate: rate,
                    point: qData.point || config.value.point || 1,
                },
            })
            useUserCard().refresh()
        } catch {
            // 静默忽略（网络错误）
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

    const ctx = {
        t, typeLabel, currentQuestion, questions, currentIndex, generating,
        genError, started, isLoggedIn, renderRef,
        onStart, goPrev, goNext, regenerate, retry, onSubmitted,
    }
    provide(AiGeneratorRenderKey, ctx)
    return ctx
}
