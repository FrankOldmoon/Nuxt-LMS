/**
 * utils/index 单元测试
 * @see modules/base/utils/index.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/index - waitForSeconds', () => {
  it('返回 Promise 并在指定秒数后 resolve', async () => {
    vi.useFakeTimers()
    try {
      const { waitForSeconds } = await import('../../utils/index')
      const spy = vi.fn()
      const p = waitForSeconds(2).then(spy)
      expect(spy).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2000)
      await p
      expect(spy).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('0 秒也返回已 resolved 的 Promise', async () => {
    const { waitForSeconds } = await import('../../utils/index')
    await expect(waitForSeconds(0)).resolves.toBeUndefined()
  })
})
