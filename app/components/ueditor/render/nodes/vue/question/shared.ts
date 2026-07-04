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

// ====================== 答案加密/解密 ======================

// 与后端一致的密钥
const ENC_KEY = 'lms_q_a_2026'

/**
 * 解密后端加密的答案值
 * 格式 'enc:base64string'，解密为原始值（字符串）
 * 非加密值（不以 'enc:' 开头）直接返回原值
 */
export function decryptValue(val: any): any {
  if (typeof val !== 'string' || !val.startsWith('enc:')) return val
  const encStr = val.slice(4)
  try {
    // Base64 解码 → URI 解码 → XOR 解密
    const binary = atob(encStr)
    const decoded = decodeURIComponent(escape(binary))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
    }
    // 还原原始类型：纯数字字符串转回 number
    if (result !== '' && !isNaN(Number(result))) {
      return Number(result)
    }
    return result
  } catch {
    return val
  }
}

/**
 * 解密整个 answer 数组（原地或返回新数组）
 */
export function decryptAnswer(answer: any[]): any[] {
  if (!Array.isArray(answer)) return answer
  return answer.map(ans => decryptValue(ans))
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
    return Math.max(0, (matching - wrong) / answer.length)
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
  return 0
}

/**
 * 提交题目答案到后端（只负责 API 调用，record 由 recordAnswer 实时记录）
 * 成功后自增 userCard 刷新触发器，让侧栏的积分/经验立即更新
 */
export async function submitQuestion(params: {
  questionId: number
  userAnswer: string[] | number[]
  isCorrect: boolean
  correctRate: number
  courseId?: number
  chapterId?: number
  point?: number
}) {
  // questionId 为 0 时（大题中的子题），跳过 API 调用
  if (!params.questionId) return
  try {
    await cRequest('/api/lms/questions/submit', {
      method: 'POST',
      body: {
        course_id: params.courseId,
        chapter_id: params.chapterId,
        question_cid: params.questionId,
        user_answer: params.userAnswer,
        is_correct: params.isCorrect,
        correct_rate: params.correctRate,
        point: params.point,
      },
    })
    // 通知 userCard 刷新（题目提交会增加课程/章节积分与经验）
    useUserCard().refresh()
  } catch {
    // 接口暂未实现，静默忽略
  }
}

/**
 * 将 Tiptap JSON 内容提取为纯文本
 */
export function contentToText(content: any): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') return extractText(content)
  return ''
}

function extractText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join('')
  }
  return ''
}

/**
 * 判断内容是否为 Tiptap 富文本 JSON（有 type + content 字段的对象）
 */
export function isRichDoc(content: any): boolean {
  return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}
