import { ref, computed, inject, provide, nextTick, onMounted } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useEvaluation(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()
  const { t } = useI18n()

  // ── ReviewConfiguration ──
  const goal = computed(() => props.question?.options?.goal || '')
  const threshold = computed(() => {
    const v = props.question?.options?.threshold
    return (typeof v === 'number' && v > 0 && v <= 1) ? v : 0.8
  })

  // ── ProgressModel：each answerRightone question increase STEP Progress，5 questionthat is 100% ──
  const STEP = 0.2

  // ── Status ──
  const chatboxRef = ref<any>(null)
  const correctCount = ref(0)   // answerRightquestion count
  const answeredCount = ref(0)  // alreadyanswer count（include answerWrong）
  const answeredQuestions = ref<Set<string>>(new Set())  // alreadyanswer nameSet（preventHeavyduplicate count）

  // ProgressbylocalGroundanswerRightquestion count calculation，noby AI control
  const progress = computed(() => Math.min(1, correctCount.value * STEP))
  const passed = computed(() => progress.value >= threshold.value)

  // ── hasAnswer：alreadyanswerAt leastone questionthat iscanSubmit ──
  const hasAnswer = computed(() => answeredCount.value > 0)

  // ── provide：for ueditorRender InsideinlineRender QuestionRender callbackAnswer Result ──
  // provide/inject pass through AiChatbox → ueditorRender → render/nodes/vue.vue → QuestionRender
  function onEvaluationAnswered({ isCorrect: correct, question: q }: { isCorrect: boolean, question: any }) {
    const qKey = q?.name || ''
    if (answeredQuestions.value.has(qKey)) return
    answeredQuestions.value.add(qKey)

    answeredCount.value++
    if (correct) correctCount.value++

    // SendAnswer Resultto LLM，LLM datathisdecideBackcontinueRightdialog
    const feedback = `[Question Result] Type: ${q?.type || ''} | Name: "${qKey}" | Correct: ${correct}`
    chatboxRef.value?.send(feedback)
    // only when answeringSavecompleteChatRecordsandSubmitBackserver
    saveAndSubmit()
  }
  provide('onEvaluationAnswered', onEvaluationAnswered)

  // ── System Hintword ──
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

  // ── OnfieldMessage ──
  const openingMessage = computed(() =>
    t('question.evaluationOpening', { goal: goal.value })
  )

  // ── SaveandSubmit：only when answeringCall，SavecompleteChatRecordsto question.record andSubmitBackserver ──
  function saveAndSubmit() {
    if (!import.meta.client) return
    const messages = chatboxRef.value?.getMessages() || []
    const recordData = {
      correctCount: correctCount.value,
      answeredCount: answeredCount.value,
      answeredQuestions: [...answeredQuestions.value],
      progress: progress.value,
      passed: passed.value,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        reasoning: m.reasoning || '',
      })),
    }
    // Saveto props.question.record（for computeCorrectRate etc.makeuse）
    recordAnswer(props.question, [recordData] as any)
    // SubmittoBackserver（persist，BackcanfromremoteResume）
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [recordData] as any,
      isCorrect: passed.value,
      correctRate: progress.value,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question?.point,
    })
  }

  // ── from record ResumeStatus ──
  function restoreFromRecord() {
    const record = Array.isArray(props.question?.record) && props.question.record.length > 0
      ? props.question.record[0]
      : null
    if (!record || typeof record !== 'object') return

    correctCount.value = Math.max(0, Number(record.correctCount) || 0)
    answeredCount.value = Math.max(0, Number(record.answeredCount) || 0)
    answeredQuestions.value = new Set(Array.isArray(record.answeredQuestions) ? record.answeredQuestions : [])

    // ResumeChatRecords（Questionby ueditorRender directlyRender，NoneneedResume _question etc.Field）
    if (Array.isArray(record.messages) && record.messages.length > 0 && chatboxRef.value) {
      chatboxRef.value.clearMessages()
      record.messages.forEach((m: any) => {
        chatboxRef.value.addMessage({
          role: m.role,
          content: m.content,
          reasoning: m.reasoning || '',
        })
      })
    }
  }

  // ── fromremoteGet record andResume ──
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
      // silentIgnore（Not Logged InorNoneRecords）
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      nextTick(() => fetchAndRestore())
    }
  })

  // ── exposetoParent ComponentMethod ──
  function submit() {
    const correct = passed.value
    if (submitted) submitted.value = true
    if (isCorrect) isCorrect.value = correct
    if (fromRecord) fromRecord.value = false
    // SavecompleteChatRecordsandSubmitBackserver（include progress/passed）
    saveAndSubmit()

    return { isCorrect: correct }
  }

  function reset() {
    correctCount.value = 0
    answeredCount.value = 0
    answeredQuestions.value = new Set()
    chatboxRef.value?.clearMessages()
    if (props.question) props.question.record = []
    // HeavyNewAddOnfieldMessage
    nextTick(() => {
      if (chatboxRef.value && openingMessage.value) {
        chatboxRef.value.addMessage({ role: 'assistant', content: openingMessage.value })
      }
    })
  }

  function fillCorrectAnswer() {
    // TeacherView Answer：willProgressfilltojustGoodPassthresholdValue
    correctCount.value = Math.ceil(threshold.value / STEP)
  }

  return {
    goal,
    threshold,
    progress,
    passed,
    hasAnswer,
    chatboxRef,
    systemPrompt,
    openingMessage,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
