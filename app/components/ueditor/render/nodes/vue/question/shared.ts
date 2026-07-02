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
  console.log('recordAnswer', question.record)
}

/**
 * 提交题目答案到后端（只负责 API 调用，record 由 recordAnswer 实时记录）
 */
export async function submitQuestion(params: {
  questionId: number
  userAnswer: string[] | number[]
  isCorrect: boolean
}) {
  try {
    await cRequest('/api/lms/questions/submit', {
      method: 'POST',
      body: {
        question_id: params.questionId,
        user_answer: params.userAnswer,
        is_correct: params.isCorrect,
      },
    })
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
