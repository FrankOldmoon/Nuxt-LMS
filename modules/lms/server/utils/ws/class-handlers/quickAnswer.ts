/**
 * 班级消息：quickAnswerStart / quickAnswerSubmit / quickAnswerEnd
 */
import { quickAnswers, broadcastToClass } from '../state'

/** quickAnswerStart: 启动抢答 */
export function handleClassQuickAnswerStart(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  quickAnswers.set(cid, { question: String(data.question || ''), winner: null, submitted: new Set() })
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerStart', question: data.question || '' }))
}

/** quickAnswerSubmit: 抢答提交（首人即赢） */
export function handleClassQuickAnswerSubmit(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const qa = quickAnswers.get(cid); if (!qa || qa.winner) return
  const from = String(data.from || 'anonymous')
  if (qa.submitted.has(from)) return
  qa.submitted.add(from); qa.winner = from
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerResult', winner: from }))
}

/** quickAnswerEnd: 结束抢答 + 清理 */
export function handleClassQuickAnswerEnd(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerEnd' }))
  quickAnswers.delete(cid)
}
