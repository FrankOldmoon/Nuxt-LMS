/**
 * WebSocket composable：管理班级内实时通信
 * - 自动连接 /api/ws
 * - joinClass(classId)：加入班级房间
 * - onInvite(callback)：监听邀请跳转事件
 * - sendInvite(classId, courseId, chapterId)：广播邀请
 * - sendDanmaku(classId, text, from)：发送弹幕
 * - onDanmaku(callback)：监听弹幕事件
 * - sendVoteStart / onVoteStart：发起/监听投票
 * - sendVoteSubmit / onVoteUpdate：提交投票/监听投票更新
 * - sendVoteEnd / onVoteEnd：结束投票/监听投票结束
 * - sendQuickAnswerStart / onQuickAnswerStart：发起/监听抢答
 * - sendQuickAnswerSubmit / onQuickAnswerResult：抢答/监听抢答结果
 * - sendQuickAnswerEnd / onQuickAnswerEnd：结束抢答/监听抢答结束
 */

type InviteCallback = (data: { courseId: number; chapterId: number; from: string }) => void
type DanmakuCallback = (data: { text: string; from: string }) => void
type VoteStartCallback = (data: { voteId: string; question: string; options: string[] }) => void
type VoteUpdateCallback = (data: { voteId: string; results: number[]; total: number }) => void
type VoteEndCallback = (data: { voteId: string; results: number[]; total: number }) => void
type QuickAnswerStartCallback = (data: { question: string }) => void
type QuickAnswerResultCallback = (data: { winner: string | null }) => void
type QuickAnswerEndCallback = () => void

// Race 回调类型
type RaceStartCallback = (data: { raceCid: number; courseId: number; from: string; totalQuestions: number; timeLimit: number }) => void
type RaceQuestionCallback = (data: { raceCid: number; question: any; questionCid: number; questionIndex: number; totalQuestions: number; timeLimit: number; options: any[]; qtype: string }) => void
type RaceAnswerUpdateCallback = (data: { raceCid: number; questionCid: number; answeredCount: number }) => void
type RaceQuestionEndCallback = (data: { raceCid: number; questionCid: number; correctAnswer: any[]; results: any[]; answeredCount: number }) => void
type RaceEndCallback = (data: { raceCid: number; leaderboard: any[] }) => void

// 模块级回调数组，确保所有组件共享同一份
const inviteCallbacks: InviteCallback[] = []
const danmakuCallbacks: DanmakuCallback[] = []
const voteStartCallbacks: VoteStartCallback[] = []
const voteUpdateCallbacks: VoteUpdateCallback[] = []
const voteEndCallbacks: VoteEndCallback[] = []
const quickAnswerStartCallbacks: QuickAnswerStartCallback[] = []
const quickAnswerResultCallbacks: QuickAnswerResultCallback[] = []
const quickAnswerEndCallbacks: QuickAnswerEndCallback[] = []

// Race 回调数组
const raceStartCallbacks: RaceStartCallback[] = []
const raceQuestionCallbacks: RaceQuestionCallback[] = []
const raceAnswerUpdateCallbacks: RaceAnswerUpdateCallback[] = []
const raceQuestionEndCallbacks: RaceQuestionEndCallback[] = []
const raceEndCallbacks: RaceEndCallback[] = []
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function dispatch(type: string, data: any) {
  switch (type) {
    case 'invite': inviteCallbacks.forEach(cb => cb(data)); break
    case 'danmaku': danmakuCallbacks.forEach(cb => cb(data)); break
    case 'voteStart': voteStartCallbacks.forEach(cb => cb(data)); break
    case 'voteUpdate': voteUpdateCallbacks.forEach(cb => cb(data)); break
    case 'voteEnd': voteEndCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerStart': quickAnswerStartCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerResult': quickAnswerResultCallbacks.forEach(cb => cb(data)); break
    case 'quickAnswerEnd': quickAnswerEndCallbacks.forEach(cb => cb()); break
    case 'raceStart': raceStartCallbacks.forEach(cb => cb(data)); break
    case 'raceQuestion': raceQuestionCallbacks.forEach(cb => cb(data)); break
    case 'raceAnswerUpdate': raceAnswerUpdateCallbacks.forEach(cb => cb(data)); break
    case 'raceQuestionEnd': raceQuestionEndCallbacks.forEach(cb => cb(data)); break
    case 'raceEnd': raceEndCallbacks.forEach(cb => cb(data)); break
  }
}

export function useWebSocket() {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const wsConnected = useState<boolean>('ws-connected', () => false)
  const joinedClassId = useState<number | null>('ws-joined-class', () => null)

  function send(data: object) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  function connect() {
    if (import.meta.server) return
    if (ws.value && ws.value.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws`

    try {
      const socket = new WebSocket(wsUrl)
      ws.value = socket

      socket.onopen = () => {
        wsConnected.value = true
        if (joinedClassId.value) {
          joinClass(joinedClassId.value)
        }
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          dispatch(data.type, data)
        } catch {
          // 忽略解析错误
        }
      }

      socket.onclose = () => {
        wsConnected.value = false
        ws.value = null
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => connect(), 3000)
      }

      socket.onerror = () => {
        // onclose 会处理
      }
    } catch {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => connect(), 3000)
    }
  }

  function joinClass(classId: number) {
    joinedClassId.value = classId
    send({ type: 'join', classId })
  }

  function sendInvite(classId: number, courseId: number, chapterId: number, from: string = 'teacher') {
    send({ type: 'invite', classId, courseId, chapterId, from })
  }

  function onInvite(callback: InviteCallback) {
    inviteCallbacks.push(callback)
  }

  function sendDanmaku(classId: number, text: string, from: string = 'anonymous') {
    send({ type: 'danmaku', classId, text: text.slice(0, 200), from })
  }

  function onDanmaku(callback: DanmakuCallback) {
    danmakuCallbacks.push(callback)
  }

  function sendVoteStart(classId: number, voteId: string, question: string, options: string[]) {
    send({ type: 'voteStart', classId, voteId, question, options })
  }

  function onVoteStart(callback: VoteStartCallback) {
    voteStartCallbacks.push(callback)
  }

  function sendVoteSubmit(classId: number, voteId: string, optionIndex: number, from: string) {
    send({ type: 'voteSubmit', classId, voteId, optionIndex, from })
  }

  function onVoteUpdate(callback: VoteUpdateCallback) {
    voteUpdateCallbacks.push(callback)
  }

  function sendVoteEnd(classId: number, voteId: string) {
    send({ type: 'voteEnd', classId, voteId })
  }

  function onVoteEnd(callback: VoteEndCallback) {
    voteEndCallbacks.push(callback)
  }

  function sendQuickAnswerStart(classId: number, question: string) {
    send({ type: 'quickAnswerStart', classId, question })
  }

  function onQuickAnswerStart(callback: QuickAnswerStartCallback) {
    quickAnswerStartCallbacks.push(callback)
  }

  function sendQuickAnswerSubmit(classId: number, from: string) {
    send({ type: 'quickAnswerSubmit', classId, from })
  }

  function onQuickAnswerResult(callback: QuickAnswerResultCallback) {
    quickAnswerResultCallbacks.push(callback)
  }

  function sendQuickAnswerEnd(classId: number) {
    send({ type: 'quickAnswerEnd', classId })
  }

  function onQuickAnswerEnd(callback: QuickAnswerEndCallback) {
    quickAnswerEndCallbacks.push(callback)
  }

  // ====================== Race 竞赛 ======================
  function sendRaceStart(classId: number, raceCid: number, courseId: number, totalQuestions: number, timeLimit: number, from: string = 'teacher') {
    send({ type: 'raceStart', classId, raceCid, courseId, totalQuestions, timeLimit, from })
  }
  function onRaceStart(callback: RaceStartCallback) {
    raceStartCallbacks.push(callback)
  }
  function sendRaceQuestion(classId: number, raceCid: number, question: any, questionCid: number, questionIndex: number, totalQuestions: number, timeLimit: number, options: any[], qtype: string) {
    send({ type: 'raceQuestion', classId, raceCid, question, questionCid, questionIndex, totalQuestions, timeLimit, options, qtype })
  }
  function onRaceQuestion(callback: RaceQuestionCallback) {
    raceQuestionCallbacks.push(callback)
  }
  function sendRaceAnswer(classId: number, raceCid: number, questionCid: number, answer: any, rate: number, correct: boolean, from: string, userId: number) {
    send({ type: 'raceAnswer', classId, raceCid, questionCid, answer, rate, correct, from, userId })
  }
  function onRaceAnswerUpdate(callback: RaceAnswerUpdateCallback) {
    raceAnswerUpdateCallbacks.push(callback)
  }
  function sendRaceQuestionEnd(classId: number, raceCid: number, correctAnswer: any[]) {
    send({ type: 'raceQuestionEnd', classId, raceCid, correctAnswer })
  }
  function onRaceQuestionEnd(callback: RaceQuestionEndCallback) {
    raceQuestionEndCallbacks.push(callback)
  }
  function sendRaceEnd(classId: number, raceCid: number) {
    send({ type: 'raceEnd', classId, raceCid })
  }
  function onRaceEnd(callback: RaceEndCallback) {
    raceEndCallbacks.push(callback)
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    wsConnected.value = false
    joinedClassId.value = null
  }

  return {
    ws, wsConnected, joinedClassId, connect, joinClass,
    sendInvite, onInvite,
    sendDanmaku, onDanmaku,
    sendVoteStart, onVoteStart, sendVoteSubmit, onVoteUpdate, sendVoteEnd, onVoteEnd,
    sendQuickAnswerStart, onQuickAnswerStart, sendQuickAnswerSubmit, onQuickAnswerResult, sendQuickAnswerEnd, onQuickAnswerEnd,
    sendRaceStart, onRaceStart, sendRaceQuestion, onRaceQuestion, sendRaceAnswer, onRaceAnswerUpdate, sendRaceQuestionEnd, onRaceQuestionEnd, sendRaceEnd, onRaceEnd,
    disconnect,
  }
}
