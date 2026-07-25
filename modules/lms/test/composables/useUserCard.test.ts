/**
 * useUserCard composable 测试
 * @see modules/lms/composables/useUserCard.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useUserCard', () => {
  it('初始 refreshTrigger 为 0', async () => {
    const { useUserCard } = await import('../../composables/useUserCard')
    const { refreshTrigger } = useUserCard()
    expect(refreshTrigger.value).toBe(0)
  })

  it('refresh() 自增 trigger', async () => {
    const { useUserCard } = await import('../../composables/useUserCard')
    const { refreshTrigger, refresh } = useUserCard()
    refresh()
    expect(refreshTrigger.value).toBe(1)
    refresh()
    refresh()
    expect(refreshTrigger.value).toBe(3)
  })

  it('跨组件调用共享同一 trigger', async () => {
    const { useUserCard } = await import('../../composables/useUserCard')
    const a = useUserCard()
    const b = useUserCard()
    expect(a.refreshTrigger).toBe(b.refreshTrigger) // 同一引用
    a.refresh()
    expect(b.refreshTrigger.value).toBe(1)
  })
})
