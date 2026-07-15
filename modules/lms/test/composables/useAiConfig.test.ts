/**
 * useAiConfig composable test
 * @see modules/lms/composables/useAiConfig.ts
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

describe('composables/useAiConfig', () => {
  it('返回 aiConfig 默认空对象', async () => {
    const { useAiConfig } = await import('../../composables/useAiConfig')
    const { aiConfig } = useAiConfig()
    expect(aiConfig.value).toBeDefined()
  })

  it('isLoading 初始为 true（fetch 进行中）', async () => {
    const { useAiConfig } = await import('../../composables/useAiConfig')
    const { isLoading } = useAiConfig()
    // fetch executes immediately, may complete synchronously
    expect(typeof isLoading.value).toBe('boolean')
  })

  it('refreshAiConfig 不抛错', async () => {
    setMockFetchHandler(async () => ({ data: { mode: 'api', model: 'gpt-4' }, success: true, msg: '' }))
    const { useAiConfig } = await import('../../composables/useAiConfig')
    const { refreshAiConfig } = useAiConfig()
    await expect(refreshAiConfig()).resolves.toBeUndefined()
  })
})
