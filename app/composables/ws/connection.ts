/**
 * WebSocket 连接管理
 *
 * 提供 ws 实例、连接状态、send / connect / disconnect / joinClass 方法。
 * connect() 内部使用 dispatch 分发收到的消息。
 */
import { dispatch } from './callbacks'

let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function useWsConnection() {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const wsConnected = useState<boolean>('ws-connected', () => false)
  const joinedClassId = useState<number | null>('ws-joined-class', () => null)

  function send(data: object) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  function joinClass(classId: number, userId?: number, from?: string) {
    joinedClassId.value = classId
    send({ type: 'join', classId, userId, from })
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
        // 注册用户级连接（用于私信推送）
        const { user } = useAuth()
        if (user.value?.id) {
          send({ type: 'registerUser', userId: user.value.id, from: user.value.name })
        }
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

  return { ws, wsConnected, joinedClassId, send, connect, disconnect, joinClass }
}
