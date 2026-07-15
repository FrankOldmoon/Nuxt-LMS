/**
 * useWebSocket composable test
 * @see modules/lms/composables/useWebSocket.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // useWebSocket needs complete useWsConnection (including joinRoom/leaveRoom etc.)
  ;(globalThis as any).useWsConnection = () => ({
    ws: ref(null),
    wsConnected: ref(false),
    joinedRooms: new Set<string>(),
    send: () => {},
    connect: () => {},
    disconnect: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
  })
})

describe('composables/useWebSocket', () => {
  it('返回连接层属性', async () => {
    const { useWebSocket } = await import('../../composables/useWebSocket')
    const result = useWebSocket()
    expect(result).toHaveProperty('ws')
    expect(result).toHaveProperty('wsConnected')
    expect(result).toHaveProperty('joinedRooms')
    expect(result).toHaveProperty('connect')
    expect(result).toHaveProperty('disconnect')
    expect(result).toHaveProperty('joinRoom')
    expect(result).toHaveProperty('leaveRoom')
  })

  it('展开 class 功能方法', async () => {
    const { useWebSocket } = await import('../../composables/useWebSocket')
    const result = useWebSocket()
    expect(result).toHaveProperty('sendInvite')
    expect(result).toHaveProperty('onInvite')
    expect(result).toHaveProperty('sendDanmaku')
    expect(result).toHaveProperty('sendVoteStart')
    expect(result).toHaveProperty('sendChatroom')
    expect(result).toHaveProperty('onChapterAccessUpdate')
  })

  it('展开 race 功能方法', async () => {
    const { useWebSocket } = await import('../../composables/useWebSocket')
    const result = useWebSocket()
    expect(result).toHaveProperty('raceJoin')
    expect(result).toHaveProperty('onRaceJoined')
    expect(result).toHaveProperty('sendRaceStart')
    expect(result).toHaveProperty('sendRaceAnswer')
    expect(result).toHaveProperty('sendRaceEnd')
  })

  it('展开 group 功能方法', async () => {
    const { useWebSocket } = await import('../../composables/useWebSocket')
    const result = useWebSocket()
    expect(result).toHaveProperty('joinGroup')
    expect(result).toHaveProperty('leaveGroup')
    expect(result).toHaveProperty('sendGroupChat')
    expect(result).toHaveProperty('onGroupChat')
  })
})
