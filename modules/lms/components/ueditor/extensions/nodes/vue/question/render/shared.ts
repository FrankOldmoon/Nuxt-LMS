/**
 * Real-time record answer to question.record (called immediately when user selects/inputs)
 * record only stores answer array, e.g. [1], [2,3], ["122","444"]
 */
export function recordAnswer(question: any, userAnswer: string[] | number[]) {
  if (!question) return
  if (!Array.isArray(question.record)) {
    question.record = []
  }
  question.record = userAnswer

}

// ====================== Answer encryption/decryption ======================

// Key consistent with backend
const ENC_KEY = 'lms_q_a_2026'

/**
 * Decrypt backend-encrypted answer value
 * Format 'enc:base64string', decrypted to original value (string)
 * Non-encrypted values (not starting with 'enc:') return as-is
 */
export function decryptValue(val: any): any {
  if (typeof val !== 'string' || !val.startsWith('enc:')) return val
  const encStr = val.slice(4)
  try {
    // Base64 decode → URI decode → XOR decrypt
    const binary = atob(encStr)
    const decoded = decodeURIComponent(escape(binary))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
    }
    // Restore original type: pure numeric string back to number
    if (result !== '' && !isNaN(Number(result))) {
      return Number(result)
    }
    return result
  } catch {
    return val
  }
}

/**
 * Decrypt entire answer array (in-place or return new array)
 */
export function decryptAnswer(answer: any[]): any[] {
  if (!Array.isArray(answer)) return answer
  return answer.map(ans => decryptValue(ans))
}

/**
 * Compute score ratio (0 ~ 1) in real-time based on record
 * - single/judge: all correct 1, otherwise 0
 * - multiple: correct selections - wrong selections, then divided by total answer count, min 0
 * - fill: correct blanks / total blanks
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
    const match ing = record.filter((r: any) => answer.includes(r)).length
    const wrong = record.filter((r: any) => !answer.includes(r)).length
    return Math.max(0, (match ing - wrong) / answer.length)
  }
  if (type === 'fill' || type === 'select') {
    if (!answer.length) return 0
    const options = question.options || []
    const correct = answer.filter((ans: any, i: number) => {
      const userVal = String(record[i] || '').trim()
      const correctVal = String(ans).trim()
      // Fill-in-the-blank supports regex match ing
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
    // HTML question: record[0] stores correct_rate (0~1) from iframe
    return Math.max(0, Math.min(1, Number(record[0]) || 0))
  }
  if (type === 'short-answer') {
    // Short answer: answer[0] is a regex, record[0] is user input
    if (!answer.length) return 0
    try {
      const re = new RegExp(answer[0])
      return re.test(String(record[0] || '')) ? 1 : 0
    } catch {
      return 0
    }
  }
  if (type === 'match') {
    // Match question: answer[i] = i (left[i] connects to right[i]), record[i] = rightOriginalIndex
    if (!answer.length) return 0
    const correct = answer.filter((_: any, i: number) => Number(record[i]) === Number(answer[i])).length
    return correct / answer.length
  }
  if (type === 'composite') {
    // Composite question: record is sub-question record array [[ans1], [ans2], ...], content is sub-question array
    const sub-questions = question.content
    if (!Array.isArray(sub-questions) || !sub-questions.length) return 0
    let totalPoint = 0
    let correctPoint = 0
    sub-questions.forEach((sub: any, i: number) => {
      const subRecord = Array.isArray(record[i]) ? record[i] : []
      const sub-question = { ...sub, record: subRecord }
      const rate = computeCorrectRate(sub-question)
      const pt = Number(sub.point) || 0
      totalPoint += pt
      correctPoint += rate * pt
    })
    return totalPoint > 0 ? correctPoint / totalPoint : 0
  }
  if (type === 'video') {
    // Video question: both conditions must be met to be correct
    // 1) watchedRatio >= 0.95 (video watched ≥ 95%)
    // 2) All sub-questions answered correctly (subRecords[cid].correct === true)
    // record[0] form: { watchedRatio: 0~1, subRecords: { cid: { correct: bool } } }
    const rec = Array.isArray(record) && record.length > 0 ? (record[0] || {}) : {}
    const watchedRatio = Math.max(0, Math.min(1, Number(rec.watchedRatio) || 0))
    const subRecords = (rec.subRecords && typeof rec.subRecords === 'object') ? rec.subRecords : {}
    const opts = question.options
    const sub-questions = (opts && typeof opts === 'object' && !Array.isArray(opts) && Array.isArray(opts.questions))
      ? opts.questions
      : []
    if (sub-questions.length === 0) {
      // When there are no sub-questions, just finishing the video counts as pass
      return watchedRatio >= 0.95 ? 1 : 0
    }
    const allCorrect = sub-questions.every((q: any) => {
      const cid = Number(q.cid) || 0
      return cid > 0 && subRecords[cid]?.correct === true
    })
    return (allCorrect && watchedRatio >= 0.95) ? 1 : 0
  }
  if (type === 'evaluation') {
    // Evaluation question: record[0] stores { progress: 0~1, passed: bool, messages: [...] }
    const rec = Array.isArray(record) && record.length > 0 ? (record[0] || {}) : {}
    return Math.max(0, Math.min(1, Number(rec.progress) || 0))
  }
  return 0
}

/**
 * Submit question answer to backend (only handles API call, record is recorded in real-time by recordAnswer)
 * On success, increment userCard refresh trigger to update sidebar points/experience immediately
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
  // When questionId is 0 (sub-question in composite), skip API call
  if (!params.questionId) return
  try {
    await cRequest('/api/questions/submit', {
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
    // Notify userCard to refresh (question submission increases course/chapter points and experience)
    useUserCard().refresh()
  } catch {
    // API not yet implemented, silently ignored
  }
}

/**
 * Determine if content is Tiptap rich text JSON (object with type + content fields)
 */
export function isRichDoc(content: any): boolean {
  return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}