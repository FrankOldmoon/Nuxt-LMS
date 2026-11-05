import { ref, computed, inject } from 'vue'
import { computeCorrectRate } from './shared'

/**
 * OJ 题型渲染逻辑
 *
 * - content 由 show.ts 替换为 fetchOj 返回的题目内容（字符串/对象），这里负责展示
 * - pid 来自 options.pid（show.ts 已写入），用于拼「前往 OJ」链接
 * - 正确与否由 hover（record.get.ts 调 getOjStatus）写入 user_question.records=[1]，
 *   本组件提供「手动复查状态」按钮，复用同一接口
 */
export function useOj(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId } = useLmsContext()
  const { oj: ojCfg } = useLmsPublicConfig()
  const chapterTask = useChapterTask()
  // quiz 模式下由 quiz 统一上报，与 useQuestionRender 的 inQuiz 门控保持一致
  const inQuiz = inject<boolean>('inQuiz', false)
  const { t } = useI18n()
  const toast = useToast()

  // pid：优先 options.pid，回退 content（未被替换时即 pid 本身）
  const pid = computed(() => {
    const opts = props.question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts) && opts.pid) return String(opts.pid)
    return typeof props.question?.content === 'string' ? props.question.content : ''
  })

  const ojUrl = computed(() => String(ojCfg.value?.url || '').replace(/\/+$/, ''))
  const ojLink = computed(() => (pid.value && ojUrl.value) ? `${ojUrl.value}/p/${pid.value}` : '')

  // 题目内容（show.ts 已替换 content）
  const contentIsString = computed(() => typeof props.question?.content === 'string')
  const problemHtml = computed(() => contentIsString.value ? String(props.question.content || '') : '')
  const problemText = computed(() => {
    const c = props.question?.content
    return (c != null && typeof c === 'object') ? JSON.stringify(c, null, 2) : ''
  })

  // content 是否仍是 pid（OJ 拉取失败的兜底识别）
  const contentIsPid = computed(() => contentIsString.value && pid.value && problemHtml.value === pid.value)

  // OJ 题无前端作答，hasAnswer=false 使 footer 的提交/重置按钮禁用（实际由 footer 隐藏）
  const hasAnswer = computed(() => false)
  const checking = ref(false)
  // 正文加载失败后的手动重试（OJ 抖动时不用刷新整页）
  const retrying = ref(false)

  async function retryLoad() {
    const cid = courseId.value
    if (!cid || !props.questionId || retrying.value) return
    retrying.value = true
    try {
      const data: any = await cRequest(`/api/questions/show?course_id=${cid}&cid=${props.questionId}`)
      const c = data?.content
      if (typeof c === 'string' && c.trim() && c.trim() !== pid.value) {
        props.question.content = c
      } else {
        toast.add({
          title: t('question.ojLoadFailed'),
          description: t('question.ojRetryFailedHint'),
          color: 'error',
          icon: 'i-lucide-cloud-off',
        })
      }
    } catch { /* 静默：保持失败态，用户可再点 */ } finally {
      retrying.value = false
    }
  }

  // 手动复查：调用 /api/questions/record（hover 同款接口），后端会调 getOjStatus 更新记录
  async function checkStatus() {
    const cid = courseId.value
    if (!props.questionId || !cid) return
    checking.value = true
    try {
      const data = await cRequest(`/api/questions/record?course_id=${cid}&cid=${props.questionId}`)
      if (!data || !props.question || !Array.isArray(data.records)) return
      // OJ 通过时 record.get.ts 才写入 records=[1]；未通过则返回空数组
      const passed = data.records.length > 0 && Number(data.records[0]) === 1
      if (!passed) {
        // 未通过：提示去 OJ 解题，不改变已提交/正确状态
        toast.add({
          title: t('question.ojNotPassed'),
          description: t('question.ojNotPassedHint'),
          color: 'warning',
          icon: 'i-lucide-alert-circle',
        })
        return
      }
      props.question.record = [...data.records]
      props.question.correct_rate = computeCorrectRate(props.question)
      if (submitted) submitted.value = true
      if (fromRecord) fromRecord.value = true
      if (isCorrect) isCorrect.value = (props.question.correct_rate || 0) > 0
      // 与 hover（useQuestionRender.fetchRecord）保持一致：上报 heading 完成，
      // 使点击「查询状态」判为通过后也能触发 heading 进度统计
      if (!inQuiz) {
        chapterTask?.reportNodeDone('question', props.questionId, (props.question.correct_rate || 0) >= 1)
      }
      toast.add({
        title: t('question.ojPassed'),
        color: 'success',
        icon: 'i-lucide-check-circle',
      })
    } catch { /* 静默 */ } finally {
      checking.value = false
    }
  }

  function submit() {
    // OJ 题型无前端作答，提交即触发一次状态复查
    checkStatus()
    return null
  }
  function reset() { /* OJ 题无需重置 */ }
  function fillCorrectAnswer() { /* OJ 题无标准答案可填充 */ }

  return {
    pid, ojUrl, ojLink, problemHtml, problemText, contentIsPid,
    submitted, isCorrect, checking, checkStatus, retrying, retryLoad,
    hasAnswer, submit, reset, fillCorrectAnswer,
  }
}
