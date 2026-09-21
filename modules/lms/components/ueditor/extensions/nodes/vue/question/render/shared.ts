/**
 * 选项随机展示顺序缓存（WeakMap：以 question 对象为键）
 *
 * single / multiple 题型的答案与 record 均以「选项原始下标」为准，
 * 这里只决定「展示顺序」——返回一个由原始下标组成的数组，
 * 数组第 pos 位存放该展示位置对应的原始下标。
 * 渲染时按该数组遍历，作答时把原始下标写回 record，
 * 即可保证展示随机而判分/记录完全不受影响。
 */
const optionOrderCache = new WeakMap<object, number[]>()

export function getShuffledOptionOrder(question: any): number[] {
  const options = Array.isArray(question?.options) ? question.options : []
  const n = options.length
  if (n <= 1) return options.map((_: any, i: number) => i)

  const cached = optionOrderCache.get(question)
  if (cached && cached.length === n) return cached

  const order = Array.from({ length: n }, (_: any, i: number) => i)
  // Fisher-Yates 洗牌；若恰好洗回原顺序则重洗，尽量让展示顺序与出题顺序不同
  const isIdentity = (arr: number[]) => arr.every((v, i) => v === i)
  for (let attempt = 0; attempt < 8; attempt++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = order[i]
      order[i] = order[j]
      order[j] = tmp
    }
    if (!isIdentity(order)) break
  }
  optionOrderCache.set(question, order)
  return order
}

/**
 * 原始展示顺序（按出题顺序 A/B/C/D）
 *
 * 多选题「显示答案」时使用：此时选项不再乱序，字母标号回到原始下标，
 * 便于学生把答案字母与题面选项一一对照。
 */
export function getOriginalOptionOrder(question: any): number[] {
  const options = Array.isArray(question?.options) ? question.options : []
  return options.map((_: any, i: number) => i)
}

/**
 * 实时记录作答到 question.record（用户选择/输入时立即调用）
 * record 只存答案数组，如 [1]、[2,3]、["122","444"]
 */
export function recordAnswer(question: any, userAnswer: string[] | number[]) {
  if (!question) return
  if (!Array.isArray(question.record)) {
    question.record = []
  }
  question.record = userAnswer

}

/**
 * 根据 record 实时计算得分比（0 ~ 1）
 * - single/judge: 全对 1，否则 0
 * - multiple: 正确选中数 - 错误选中数，再除以答案总数，下限 0
 * - fill: 答对空数 / 总空数
 */
export function computeCorrectRate(question: any): number {
  if (!question || !question.answer || !Array.isArray(question.answer)) return 0
  const record = Array.isArray(question.record) ? question.record : []
  const answer = question.answer
  const type = question.type

  if (record.length === 0) return 0

  if (type === 'single' || type === 'judge') {
    return record[0] === answer[0] ? 1 : 0
  }
  if (type === 'multiple') {
    if (!answer.length) return 0
    const matching = record.filter((r: any) => answer.includes(r)).length
    const wrong = record.filter((r: any) => !answer.includes(r)).length
    // 错选清零：选中了错误项即为 0 分（防全选白嫖）；漏选仍按 选对项数/答案总数 给部分分
    return wrong > 0 ? 0 : matching / answer.length
  }
  if (type === 'fill' || type === 'select') {
    if (!answer.length) return 0
    const options = question.options || []
    const correct = answer.filter((ans: any, i: number) => {
      const userVal = String(record[i] || '').trim()
      const correctVal = String(ans).trim()
      // 填空题支持正则表达式匹配
      if (type === 'fill' && options[i] === 'regex') {
        try {
          return new RegExp(correctVal).test(userVal)
        } catch {
          return false
        }
      }
      return userVal === correctVal
    }).length
    return correct / answer.length
  }
  if (type === 'sort') {
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => record[i] === answer[i]).length
    return correct / answer.length
  }
  if (type === 'classify') {
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(record[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'puzzle') {
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(record[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'html') {
    // HTML 题：record[0] 存储 iframe 传来的 correct_rate (0~1)
    return Math.max(0, Math.min(1, Number(record[0]) || 0))
  }
  if (type === 'short-answer') {
    // 简答题：answer[0] 是正则表达式，record[0] 是用户输入
    if (!answer.length) return 0
    try {
      const re = new RegExp(answer[0])
      return re.test(String(record[0] || '')) ? 1 : 0
    } catch {
      return 0
    }
  }
  if (type === 'match') {
    // 连线题：answer[i] = i（left[i] 连 right[i]），record[i] = rightOriginalIndex
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(record[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'composite') {
    // 大题：record 是子题记录数组 [[ans1], [ans2], ...]，content 是子题数组
    const subQuestions = question.content
    if (!Array.isArray(subQuestions) || !subQuestions.length) return 0
    let totalPoint = 0
    let correctPoint = 0
    subQuestions.forEach((sub: any, i: number) => {
      const subRecord = Array.isArray(record[i]) ? record[i] : []
      const subQuestion = { ...sub, record: subRecord }
      const rate = computeCorrectRate(subQuestion)
      const pt = Number(sub.point) || 0
      totalPoint += pt
      correctPoint += rate * pt
    })
    return totalPoint > 0 ? correctPoint / totalPoint : 0
  }
  if (type === 'video') {
    // 视频题：同时满足才正确
    // 1) watchedRatio >= 0.95（视频已观看 ≥ 95%）
    // 2) 所有子题答对（subRecords[cid].correct === true）
    // record[0] 形式：{ watchedRatio: 0~1, subRecords: { cid: { correct: bool } } }
    const rec = Array.isArray(record) && record.length > 0 ? (record[0] || {}) : {}
    const watchedRatio = Math.max(0, Math.min(1, Number(rec.watchedRatio) || 0))
    const subRecords = (rec.subRecords && typeof rec.subRecords === 'object') ? rec.subRecords : {}
    const opts = question.options
    const subQuestions = (opts && typeof opts === 'object' && !Array.isArray(opts) && Array.isArray(opts.questions))
      ? opts.questions
      : []
    if (subQuestions.length === 0) {
      // 无子题时，只要视频看完就算通过
      return watchedRatio >= 0.95 ? 1 : 0
    }
    const allCorrect = subQuestions.every((q: any) => {
      const cid = Number(q.cid) || 0
      return cid > 0 && subRecords[cid]?.correct === true
    })
    return (allCorrect && watchedRatio >= 0.95) ? 1 : 0
  }
  if (type === 'evaluation') {
    // 评价题：record[0] 存储 { progress: 0~1, passed: bool, messages: [...] }
    const rec = Array.isArray(record) && record.length > 0 ? (record[0] || {}) : {}
    return Math.max(0, Math.min(1, Number(rec.progress) || 0))
  }
  if (type === 'oj') {
    // OJ 题：record[0]=1 表示已通过（由 record.get.ts 调 getOjStatus 写入），否则 0
    return Number(record[0]) === 1 ? 1 : 0
  }
  return 0
}

/**
 * 提交题目答案到后端（服务端判分）
 *
 * show 接口不再下发 answer/explanation，判分完全由服务端完成。
 * 提交成功后响应携带 { isCorrect, rate, answer, explanation, content }，
 * 这里把 answer/explanation 合并回 question 对象（供红绿高亮、
 * formattedAnswers、ExplanationBlock 使用）并返回响应供调用方判断对错。
 *
 * @returns 判分结果；未登录/网络失败/questionId 为 0（子题）时返回 null
 */
export async function submitQuestion(params: {
  questionId: number
  userAnswer: string[] | number[]
  courseId?: number
  chapterId?: number
  point?: number
  /** 当前题目对象（响应中的 answer/explanation 会合并进去） */
  question?: any
}): Promise<{ isCorrect: boolean; rate: number; score: number; answer?: any[]; explanation?: any } | null> {
  // questionId 为 0 时（大题中的子题），跳过 API 调用
  if (!params.questionId) return null
  try {
    const parentCourseId = useEmbeddingParentCourse()
    const res = await cRequest('/api/questions/submit', {
      method: 'POST',
      body: {
        course_id: params.courseId,
        chapter_id: params.chapterId,
        question_cid: params.questionId,
        user_answer: params.userAnswer,
        ...(parentCourseId ? { parent_course_id: parentCourseId } : {}),
      },
    })
    if (params.question && res) {
      // 合并服务端返回的答案/解析（composite 子题答案在 content 内）
      if (Array.isArray(res.answer)) params.question.answer = [...res.answer]
      else if (res.answer !== undefined) params.question.answer = res.answer
      if (res.explanation !== undefined) params.question.explanation = res.explanation
      if (Array.isArray(res.content) && params.question.type === 'composite') {
        params.question.content = res.content
      }
      params.question.correct_rate = res.rate || 0
    }
    // 通知 userCard 刷新（题目提交会增加课程/章节积分与经验）
    useUserCard().refresh()
    return res
  } catch {
    // 接口暂未实现或网络错误，静默忽略
    return null
  }
}

/**
 * 判断内容是否为 Tiptap 富文本 JSON（有 type + content 字段的对象）
 */
export function isRichDoc(content: any): boolean {
  return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}