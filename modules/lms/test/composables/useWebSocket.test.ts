/**
 * useWebSocket composable 测试
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
  // useWebSocket 需要完整的 useWsConnection（含 joinClass 等）
  ;(globalThis as any).useWsConnection = () => ({
    ws: ref(null),
    wsConnected: ref(false),
    joinedClassId: ref<number | null>(null),
    send: () => {},
    connect: () => {},
    disconnect: () => {},
    joinClass: () => {},
    joinedGroupIds: new Set<string>(),
  })
})

describe('composables/useWebSocket', () => {
  it('返回连接层属性', async () => {
    const { useWebSocket } = await import('../../composables/useWebSocket')
    const result = useWebSocket()
    expect(result).toHaveProperty('ws')
    expect(result).toHaveProperty('wsConnected')
    expect(result).toHaveProperty('joinedClassId')
    expect(result).toHaveProperty('connect')
    expect(result).toHaveProperty('disconnect')
    expect(result).toHaveProperty('joinClass')
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
