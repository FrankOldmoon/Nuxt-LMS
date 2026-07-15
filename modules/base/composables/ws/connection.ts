/**
 * WebSocket connection management (generic)
 *
 * Provides ws instance, connection state, send / connect / disconnect / joinRoom / leaveRoom methods.
 * connect() internally uses dispatch to distribute received messages.
 *
 * base only provides the generic room mechanism; class/group and other business rooms are handled by subsequent modules
 * via registerWsHandler (composables/ws/callbacks) + server-side
 * registerWsServerHandler on their own.
 */
import { dispatch } from './callbacks'

let reconnectTimer: ReturnType<typeof setTimeout> | null = null

/** Set of joined room IDs (client-side singleton, auto re-joins on reconnect) */
const joinedRooms = new Set<string>()

export function useWsConnection() {
  const ws = useState<WebSocket | null>('ws-connection', () => null)
  const wsConnected = useState<boolean>('ws-connected', () => false)

  function send(data: object) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  /** Join a specified room (auto re-joins on reconnect) */
  function joinRoom(room: string) {
    joinedRooms.add(room)
    send({ type: 'join', room })
  }

  /** Leave a room */
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
        // Register user-level connection (for direct message push)
        // Use getAuthUserSync to read from payload cache, avoid calling useFetch in callback
        const user = getAuthUserSync()
        if (user?.id) {
          send({ type: 'registerUser', userId: user.id, from: user.name })
        }
        // Re-join all rooms
        for (const room of joinedRooms) {
          send({ type: 'join', room })
        }
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          dispatch(data.type, data)
        } catch {
          // Ignore parse errors
        }
      }

      socket.onclose = () => {
        wsConnected.value = false
        ws.value = null
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => connect(), 3000)
      }

      socket.onerror = () => {
        // onclose will handle it
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
