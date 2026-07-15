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

    // question typeTag（useinTopShow）
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

    // ====================== Status ======================
    const questions = ref<any[]>([])
    const currentIndex = ref(0)
    const generating = ref(false)
    const genError = ref('')
    // YesNoalreadyClick Start（notClickFrontnoAutogenerate question）
    const started = ref(false)
    const renderRef = ref<any>(null) // QuestionRender Component reference

    // preGenerate promise（nonResponsetype，avoidTrigger watch）
    let nextPromise: Promise<any> | null = null

    const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

    // ====================== LLM generate question ======================

    /**
     * Build system hintword：inject each question type prompt + Currentquestion type requirements
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
     * Call /api/aichat/chat GenerateoneQuestion（SSE streaming），ReturnAnalysisBack question Object
     */
    async function generateQuestion() {
        const cfg = config.value
        const type = cfg.questionType || 'single'
        const refText = cfg.referenceText || ''
        const model = cfg.model || 'glm-4.5-air'
        const thinking = cfg.thinking || false

        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: `pleaseGenerateone${typeLabel.value[type] || type}Question。${refText ? `referenceText：\n${refText}` : 'pleaselinesSelectrelativeOffknowledgePointgenerate question。'}` },
        ]

        const response = await fetch('/api/aichat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model, thinking }),
        })

        // non-streamingResponse = Error（cResp Return JSON）
        const content type = response.headers.get('Content-Type') || ''
        if (!content type.includes('text/event-stream')) {
            let msg = t('ueditor.aigeneratorFailed')
            try {
                const data = await response.json()
                msg = data.msg || msg
            } catch { /* noop */ }
            throw new Error(msg)
        }

        // Analysis SSE stream，concatenate complete content
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
     * Analysis LLM Return JSON Question，allowWrongHandle（go to markdown mark、extract JSON、completeField）
     */
    function parseQuestionJson(text: string, expectedType: string) {
        let cleaned = text.trim()
        // remove markdown Code Blockmark
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
        }
        // extractFirstitems { tomostBackoneitems } betweenContent
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.slice(start, end + 1)
        }
        const q = JSON.parse(cleaned)
        // force question typeConfiguration question type
        q.type = expectedType
        // completeField
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
     * ensure nextPromise Exist（BackpreloadGenerateNext Question），Returnthe promise
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
     * GenerateoneNewquestionandAppendto questions，Switch currentIndex，andpreGenerateNext Question
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
            // preGenerateNext Question（fire and forget）
            ensureNextQuestion()
        } catch (err: any) {
            genError.value = err.message || t('ueditor.aigeneratorFailed')
            nextPromise = null
        } finally {
            generating.value = false
        }
    }

    /**
     * SwitchtoNext Question：alreadyHasthen directlySwitch，ElseGenerateNewquestion
     */
    async function goNext() {
        if (currentIndex.value < questions.value.length - 1) {
            currentIndex.value++
            return
        }
        await startGeneration()
    }

    /**
     * SwitchtoPrevious Question
     */
    function goPrev() {
        if (currentIndex.value > 0) {
            currentIndex.value--
        }
    }

    /**
     * RegenerateCurrentquestion（Replace）
     */
    async function regenerate() {
        if (generating.value) return
        generating.value = true
        genError.value = ''
        try {
            const q = await generateQuestion()
            q.submitted = false
            q.isCorrect = false
            // ReplaceCurrentquestion
            questions.value[currentIndex.value] = q
        } catch (err: any) {
            genError.value = err.message || t('ueditor.aigeneratorFailed')
        } finally {
            generating.value = false
        }
    }

    /**
     * Retry（outWrongwhen）
     */
    async function retry() {
        genError.value = ''
        if (questions.value.length === 0) {
            await startGeneration()
        } else {
            await regenerate()
        }
    }

    // ====================== QuestionRender SubmitCallback ======================

    /**
     * QuestionRender SubmittedCallback：RecordsPoints + UpdateQuestion Status
     */
    async function onSubmitted({ isCorrect }: { isCorrect: boolean; questionId?: number }) {
        if (!currentQuestion.value) return

        const qData = currentQuestion.value
        const rate = computeCorrectRate(qData)

        // store each questionStatus（SwitchwhenResume）
        qData.submitted = true
        qData.isCorrect = isCorrect
        qData.correct_rate = rate

        // UpreportChapterTaskCompleteStatus（makeuse index as cid avoid conflicts）
        chapterTask?.reportNodeDone('aigenerator', currentIndex.value + 1, isCorrect)

        // RecordsPointsto user_chapter / user_courses（no records user_question）
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
            // silentIgnore（Network Error）
        }
    }

    // ====================== Start Trigger ======================

    /**
     * UserClick Start BackStartgenerate question（Firsttimes/RestartallCallthisFunction）
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

    // ====================== AutoGenerateFirstquestion ======================
    // alreadyinstead：mustmustUserClick Start Buttononlygenerate question，nothen onMounted AutoTrigger
    onMounted(() => {
        if (!import.meta.client) return
        // preservecanextensionPoint：futurecanthischeckChapterTask/CacheResume
    })

    const ctx = {
        t, typeLabel, currentQuestion, questions, currentIndex, generating,
        genError, started, isLoggedIn, renderRef,
        onStart, goPrev, goNext, regenerate, retry, on submitted,
    }
    provide(AiGeneratorRenderKey, ctx)
    return ctx
}
