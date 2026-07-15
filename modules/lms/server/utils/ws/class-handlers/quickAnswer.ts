/**
 * Class messages: quickAnswerStart / quickAnswerSubmit / quickAnswerEnd
 */
import { quickAnswers, broadcastToClass } from '../state'

/** quickAnswerStart: start a quick answer round */
export function handleClassQuickAnswerStart(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  quickAnswers.set(cid, { question: String(data.question || ''), winner: null, submitted: new Set() })
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerStart', question: data.question || '' }))
}

/** quickAnswerSubmit: quick answer submit (first one wins) */
export function handleClassQuickAnswerSubmit(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const qa = quickAnswers.get(cid); if (!qa || qa.winner) return
  const from = String(data.from || 'anonymous')
  if (qa.submitted.has(from)) return
  qa.submitted.add(from); qa.winner = from
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerResult', winner: from }))
}

/** quickAnswerEnd: end quick answer + clear state */
export function handleClassQuickAnswerEnd(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  broadcastToClass(cid, JSON.stringify({ type: 'quickAnswerEnd' }))
  quickAnswers.delete(cid)
}
