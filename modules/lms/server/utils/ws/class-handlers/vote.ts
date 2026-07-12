/**
 * 班级消息：voteStart / voteSubmit / voteEnd
 */
import { votes, broadcastToClass } from '../state'

/** voteStart: 启动一次投票 */
export function handleClassVoteStart(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const voteId = String(data.voteId || Date.now())
  const options: string[] = Array.isArray(data.options) ? data.options.slice(0, 10) : ['A', 'B']
  votes.set(voteId, {
    classId: cid, question: String(data.question || ''),
    options, results: new Array(options.length).fill(0), votedUsers: new Set(),
  })
  broadcastToClass(cid, JSON.stringify({ type: 'voteStart', voteId, question: data.question || '', options }))
}

/** voteSubmit: 提交投票选项 */
export function handleClassVoteSubmit(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const voteId = String(data.voteId)
  const v = votes.get(voteId)
  if (!v || v.classId !== cid) return
  const from = String(data.from || 'anonymous')
  if (v.votedUsers.has(from)) return
  const idx = Number(data.optionIndex)
  if (!Number.isInteger(idx) || idx < 0 || idx >= v.options.length) return
  v.votedUsers.add(from); v.results[idx]!++
  broadcastToClass(cid, JSON.stringify({ type: 'voteUpdate', voteId, results: v.results, total: v.votedUsers.size }))
}

/** voteEnd: 结束投票 + 清理状态 */
export function handleClassVoteEnd(_peer: any, data: any) {
  const cid = Number(data.classId); if (!cid) return
  const voteId = String(data.voteId)
  const v = votes.get(voteId)
  if (!v || v.classId !== cid) return
  broadcastToClass(cid, JSON.stringify({ type: 'voteEnd', voteId, results: v.results, total: v.votedUsers.size }))
  votes.delete(voteId)
}
