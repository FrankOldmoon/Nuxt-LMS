/**
 * WebSocket 连接管理（通用）
 *
 * 提供 ws 实例、连接状态、send / connect / disconnect / joinRoom / leaveRoom 方法。
 * connect() 内部使用 dispatch 分发收到的消息。
 *
 * base 只提供通用房间机制；class/group 等业务房间由后续模块
 * 通过 registerWsHandler（composables/ws/callbacks）+ 服务端
 * registerWsServerHandler 自行处理。
 */
import { dispatch } from './callbacks'

let reconnectTimer: ReturnType<typeof setTimeout> | null = null

/** 已加入的房间 ID 集合（客户端单例，断线重连时自动重新加入） */
const joinedRooms = new Set<string>()

export function useWsConnection() {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const wsConnected = useState<boolean>('ws-connected', () => false)

  function send(data: object) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  /** 加入指定房间（断线重连自动重新加入） */
  function joinRoom(room: string) {
    joinedRooms.add(room)
    send({ type: 'join', room })
  }

  /** 离开房间 */
  function leaveRoom(room: string) {
    joinedRooms.delete(room)
    send({ type: 'leave', room })
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
        // 重新加入所有房间
        for (const room of joinedRooms) {
          send({ type: 'join', room })
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
    joinedRooms.clear()
  }

  return { ws, wsConnected, joinedRooms, send, connect, disconnect, joinRoom, leaveRoom }
}
