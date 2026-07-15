/**
 * useUnreadCounts composable tests
 * @see modules/base/composables/useUnreadCounts.ts
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

describe('composables/useUnreadCounts', () => {
  it('初始未读数为 0', async () => {
    const { useUnreadCounts } = await import('../../composables/useUnreadCounts')
    const { counts } = useUnreadCounts()
    expect(counts.value.notifyUnread).toBe(0)
    expect(counts.value.msgUnread).toBe(0)
  })

  it('refresh 不抛错', async () => {
    setMockFetchHandler(async () => ({
      data: { notifyUnread: 5, msgUnread: 3 },
      success: true,
      msg: '',
    }))
    const { useUnreadCounts } = await import('../../composables/useUnreadCounts')
    const { refresh } = useUnreadCounts()
    await expect(refresh()).resolves.toBeUndefined()
  })
})
