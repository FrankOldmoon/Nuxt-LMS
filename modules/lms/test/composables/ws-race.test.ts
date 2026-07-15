/**
 * ws/race composable test
 * @see modules/lms/composables/ws/race.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  dispatchWsHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/ws/race', () => {
  it('raceJoin 发送 join 消息', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsRace } = await import('../../composables/ws/race')
    const { raceJoin } = useWsRace()
    raceJoin('ABC123')
    expect(sentMsg).toEqual({ type: 'raceJoin', pin: 'ABC123' })
  })

  it('onRaceJoined 注册 handler 并可被 dispatch 触发', async () => {
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: () => {},
    })
    const { useWsRace } = await import('../../composables/ws/race')
    const { onRaceJoined } = useWsRace()
    const cb = vi.fn()
    onRaceJoined(cb)
    dispatchWsHandler('raceJoined', { pin: 'ABC123' })
    expect(cb).toHaveBeenCalledWith({ pin: 'ABC123' })
  })

  it('sendRaceStart 发送完整参数', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsRace } = await import('../../composables/ws/race')
    const { sendRaceStart } = useWsRace()
    sendRaceStart('PIN', 1, 10, 5, 60, 'teacher')
    expect(sentMsg).toEqual({ type: 'raceStart', pin: 'PIN', raceCid: 1, courseId: 10, totalQuestions: 5, timeLimit: 60, from: 'teacher' })
  })

  it('sendRaceAnswer 发送答案', async () => {
    let sentMsg: any = null
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: (msg: any) => { sentMsg = msg },
    })
    const { useWsRace } = await import('../../composables/ws/race')
    const { sendRaceAnswer } = useWsRace()
    sendRaceAnswer('PIN', 1, 100, 'A', 0.5, true, 'alice', 42)
    expect(sentMsg).toEqual({ type: 'raceAnswer', pin: 'PIN', raceCid: 1, questionCid: 100, answer: 'A', rate: 0.5, correct: true, from: 'alice', userId: 42 })
  })

  it('onRaceEnd 注册 handler', async () => {
    ;(globalThis as any).useWsConnection = () => ({
      ws: ref(null),
      wsConnected: ref(true),
      send: () => {},
    })
    const { useWsRace } = await import('../../composables/ws/race')
    const { onRaceEnd } = useWsRace()
    const cb = vi.fn()
    onRaceEnd(cb)
    dispatchWsHandler('raceEnd', { pin: 'PIN' })
    expect(cb).toHaveBeenCalledWith({ pin: 'PIN' })
  })
})
