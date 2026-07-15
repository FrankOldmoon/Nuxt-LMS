/**
 * useMedals composable test
 * @see modules/lms/composables/useMedals.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useMedals', () => {
  it('初始 myMedals 为空数组', async () => {
    const { useMedals } = await import('../../composables/useMedals')
    const { myMedals } = useMedals()
    expect(myMedals.value).toEqual([])
  })

  it('fetchMyMedals 加载奖章列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/medals/my')) {
        return { data: [{ medalId: 1, name: 'First Quiz', content: { icon: 'star', color: 'gold', tier: 1, description: '', conditions: [], logic: 'all' }, createdAt: '2024-01-01' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMedals } = await import('../../composables/useMedals')
    const { myMedals, fetchMyMedals } = useMedals()
    await fetchMyMedals()
    expect(myMedals.value).toHaveLength(1)
    expect(myMedals.value[0].name).toBe('First Quiz')
  })

  it('checkMedals 无 courseId 时不调用', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: [], success: true, msg: '' }
    })
    const { useMedals } = await import('../../composables/useMedals')
    const { checkMedals } = useMedals()
    await checkMedals(0)
    expect(called).toBe(false)
  })

  it('checkMedals 有新奖章时刷新列表', async () => {
    let newMedalCallCount = 0
    let myMedalsCallCount = 0
    setMockFetchHandler(async (url, opts: any) => {
      if (url.startsWith('/api/medals/check')) {
        newMedalCallCount++
        return { data: [10, 11], success: true, msg: '' }
      }
      if (url.startsWith('/api/medals/my')) {
        myMedalsCallCount++
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMedals } = await import('../../composables/useMedals')
    const { checkMedals } = useMedals()
    await checkMedals(1)
    expect(newMedalCallCount).toBe(1)
    expect(myMedalsCallCount).toBe(1) // Trigger refresh
  })

  it('checkMedals 无新奖章时不刷新', async () => {
    let newMedalCallCount = 0
    let myMedalsCallCount = 0
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/medals/check')) {
        newMedalCallCount++
        return { data: [], success: true, msg: '' }
      }
      if (url.startsWith('/api/medals/my')) {
        myMedalsCallCount++
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMedals } = await import('../../composables/useMedals')
    const { checkMedals } = useMedals()
    await checkMedals(1)
    expect(newMedalCallCount).toBe(1)
    expect(myMedalsCallCount).toBe(0) // Does not refresh
  })
})
