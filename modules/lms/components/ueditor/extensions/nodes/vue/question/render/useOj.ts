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

  // pid：优先 options.pid，回退 content（未被替换时即 pid 本身）
  const pid = computed(() => {
    const opts = props.question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts) && opts.pid) return String(opts.pid)
    return typeof props.question?.content === 'string' ? props.question.content : ''
  })

  const ojUrl = computed(() => String(ojCfg.value?.url || 'http://10.28.1.155').replace(/\/+$/, ''))
  const ojLink = computed(() => pid.value ? `${ojUrl.value}/p/${pid.value}` : '')

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

  // 手动复查：调用 /api/questions/record（hover 同款接口），后端会调 getOjStatus 更新记录
  async function checkStatus() {
    const cid = courseId.value
    if (!props.questionId || !cid) return
    checking.value = true
    try {
      const data = await cRequest(`/api/questions/record?course_id=${cid}&cid=${props.questionId}`)
      if (data && props.question && Array.isArray(data.records) && data.records.length > 0) {
        props.question.record = [...data.records]
        props.question.correct_rate = computeCorrectRate(props.question)
        if (submitted) submitted.value = true
        if (fromRecord) fromRecord.value = true
        if (isCorrect) isCorrect.value = (props.question.correct_rate || 0) > 0
      }
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
    submitted, isCorrect, checking, checkStatus,
    hasAnswer, submit, reset, fillCorrectAnswer,
  }
}
