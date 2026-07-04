/**
 * WebSocket composable：管理班级内实时通信
 * - 自动连接 /api/ws
 * - joinClass(classId)：加入班级房间
 * - onInvite(callback)：监听邀请跳转事件
 * - sendInvite(classId, courseId, chapterId)：广播邀请
 * - sendDanmaku(classId, text, from)：发送弹幕
 * - onDanmaku(callback)：监听弹幕事件
 */

type InviteCallback = (data: { courseId: number; chapterId: number; from: string }) => void
type DanmakuCallback = (data: { text: string; from: string }) => void

export function useWebSocket() {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const wsConnected = useState<boolean>('ws-connected', () => false)
  const joinedClassId = useState<number | null>('ws-joined-class', () => null)
  const inviteCallbacks = useState<InviteCallback[]>('ws-invite-callbacks', () => [])
  const danmakuCallbacks = useState<DanmakuCallback[]>('ws-danmaku-callbacks', () => [])
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

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
        // 重连后自动重新加入班级
        if (joinedClassId.value) {
          joinClass(joinedClassId.value)
        }
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'invite') {
            inviteCallbacks.value.forEach(cb => cb(data))
          } else if (data.type === 'danmaku') {
            danmakuCallbacks.value.forEach(cb => cb(data))
          }
        } catch {
          // 忽略解析错误
        }
      }

      socket.onclose = () => {
        wsConnected.value = false
        ws.value = null
        // 自动重连（3 秒后）
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => connect(), 3000)
      }

      socket.onerror = () => {
        // onclose 会处理
      }
    } catch {
      // 连接失败，3 秒后重试
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => connect(), 3000)
    }
  }

  function joinClass(classId: number) {
    joinedClassId.value = classId
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type: 'join', classId }))
    }
  }

  function sendInvite(classId: number, courseId: number, chapterId: number, from: string = 'teacher') {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type: 'invite', classId, courseId, chapterId, from }))
    }
  }

  function onInvite(callback: InviteCallback) {
    inviteCallbacks.value.push(callback)
  }

  function sendDanmaku(classId: number, text: string, from: string = 'anonymous') {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type: 'danmaku', classId, text: text.slice(0, 200), from }))
    }
  }

  function onDanmaku(callback: DanmakuCallback) {
    danmakuCallbacks.value.push(callback)
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

  return { ws, wsConnected, joinedClassId, connect, joinClass, sendInvite, onInvite, sendDanmaku, onDanmaku, disconnect }
}
