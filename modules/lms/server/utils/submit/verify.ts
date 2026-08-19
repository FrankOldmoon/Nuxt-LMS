/**
 * 服务端题目判分（防客户端伪造 correct_rate / point）
 *
 * 与前端 shared.ts 的 computeCorrectRate 逻辑对齐：
 *  - answer 在 DB 中以 'enc:' XOR 混淆存储，判分前先解密
 *  - single/judge/multiple/fill/select/sort/classify/puzzle/short-answer/match/composite
 *    可由服务端根据 user_answer 重算得分比
 *  - html/evaluation/oj/video 由客户端环境判定（iframe postMessage / 播放进度等），
 *    服务端无法复算，仅接收客户端 rate 并 clamp 到 [0,1]
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

const ENC_KEY = 'lms_q_a_2026'

/** 解密单个答案值（'enc:base64' XOR），非加密值原样返回 */
function decryptValue(val: any): any {
  if (typeof val !== 'string' || !val.startsWith('enc:')) return val
  const encStr = val.slice(4)
  try {
    const binary = Buffer.from(encStr, 'base64').toString('binary')
    let result = ''
    for (let i = 0; i < binary.length; i++) {
      result += String.fromCharCode(binary.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
    }
    if (result !== '' && !isNaN(Number(result))) {
      return Number(result)
    }
    return result
  } catch {
    return val
  }
}

/** 解密整个 answer 数组 */
function decryptAnswer(answer: any[]): any[] {
  if (!Array.isArray(answer)) return answer
  return answer.map(ans => decryptValue(ans))
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** 客户端判定型题型：服务端无法复算，只能 clamp */
const CLIENT_JUDGED_TYPES = new Set(['html', 'evaluation', 'oj', 'video'])

/**
 * 服务端根据题目定义与用户作答重算得分比（0~1）
 * question: DB questions 行（answer 会被原地解密）
 * record: 用户作答数组（同前端 question.record 格式）
 */
export function computeServerRate(question: any, record: any): number {
  if (!question || !Array.isArray(question.answer)) return 0
  const rate = computeRateByType(question, record)
  return clamp01(Number(rate) || 0)
}

function computeRateByType(question: any, record: any): number {
  const type = question.type
  // 客户端判定型：record[0] 即客户端计算的 rate
  if (CLIENT_JUDGED_TYPES.has(type)) {
    const rec = Array.isArray(record) ? record : []
    return clamp01(Number(rec[0]) || 0)
  }

  const answer = decryptAnswer(question.answer)
  const rec = Array.isArray(record) ? record : []
  if (rec.length === 0) return 0

  if (type === 'single' || type === 'judge') {
    return rec[0] === answer[0] ? 1 : 0
  }
  if (type === 'multiple') {
    if (!answer.length) return 0
    const matching = rec.filter((r: any) => answer.includes(r)).length
    const wrong = rec.filter((r: any) => !answer.includes(r)).length
    return Math.max(0, (matching - wrong) / answer.length)
  }
  if (type === 'fill' || type === 'select') {
    if (!answer.length) return 0
    const options = question.options || []
    const correct = answer.filter((ans: any, i: number) => {
      const userVal = String(rec[i] ?? '').trim()
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
    const correct = answer.filter((_: any, i: number) => rec[i] === answer[i]).length
    return correct / answer.length
  }
  if (type === 'classify' || type === 'puzzle') {
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(rec[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'short-answer') {
    if (!answer.length) return 0
    try {
      return new RegExp(String(answer[0])).test(String(rec[0] || '')) ? 1 : 0
    } catch {
      return 0
    }
  }
  if (type === 'match') {
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(rec[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'composite') {
    // 大题：rec 是子题作答数组 [[ans1], [ans2], ...]，content 是子题数组
    const subQuestions = question.content
    if (!Array.isArray(subQuestions) || !subQuestions.length) return 0
    let totalPoint = 0
    let correctPoint = 0
    subQuestions.forEach((sub: any, i: number) => {
      const subRecord = Array.isArray(rec[i]) ? rec[i] : []
      const rate = computeRateByType(sub, subRecord)
      const pt = Number(sub.point) || 0
      totalPoint += pt
      correctPoint += rate * pt
    })
    return totalPoint > 0 ? correctPoint / totalPoint : 0
  }
  return 0
}

export interface VerifiedQuestion {
  /** 服务端重算的得分比（0~1） */
  rate: number
  /** 服务端读取的题目分值（DB point） */
  point: number
  isCorrect: boolean
  /** DB 题目定义（answer/explanation/content 明文，供提交响应回传前端显示） */
  question: any
}

/**
 * 加载 DB 题目并服务端判分。
 * 题目不存在于 DB（如已被删除）时返回 null（调用方应拒绝计分）。
 */
export async function verifyQuestionAnswer(
  courseId: number,
  questionCid: number,
  userAnswer: any,
): Promise<VerifiedQuestion | null> {
  const question = await db.query.questions.findFirst({
    where: and(
      eq(schema.questions.courseId, courseId),
      eq(schema.questions.cid, questionCid),
    ),
  })
  if (!question) return null

  const rate = computeServerRate(question, userAnswer)
  const point = Number(question.point) || 0
  return { rate, point, isCorrect: rate > 0, question }
}
