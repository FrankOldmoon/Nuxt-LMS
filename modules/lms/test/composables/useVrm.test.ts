/**
 * useVrm composable test
 * @see modules/lms/composables/useVrm.ts
 *
 * Note: useVrm's core logic (CDN loading, Three.js scene, VRM model loading) executes in onMounted,
 * test environment has no active component instance, onMounted won't trigger.
 * Therefore only synchronous parts are tested: initial refs, close(), t function, subscribeVrmSpeech subscription registration.
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
})

describe('composables/useVrm', () => {
  it('初始状态正确', async () => {
    const { useVrm } = await import('../../composables/useVrm')
    const { canvasRef, loadState, loadingLabel, errorMsg } = useVrm({ modelUrl: 'http://example.com/model.vrm' }, () => {})
    expect(canvasRef.value).toBeNull()
    expect(loadState.value).toBe('loading')
    expect(loadingLabel.value).toBe('ai.vrmLoading')
    expect(errorMsg.value).toBe('')
  })

  it('close 发出 close 事件', async () => {
    const { useVrm } = await import('../../composables/useVrm')
    let emittedEvent = ''
    const { close } = useVrm({ modelUrl: 'http://example.com/model.vrm' }, (e: string) => { emittedEvent = e })
    close()
    expect(emittedEvent).toBe('close')
  })

  it('t 函数返回 i18n t', async () => {
    const { useVrm } = await import('../../composables/useVrm')
    const { t } = useVrm({ modelUrl: 'http://example.com/model.vrm' }, () => {})
    expect(t('ai.vrmLoading')).toBe('ai.vrmLoading')
    expect(t('some.other.key')).toBe('some.other.key')
  })

  it('无 modelUrl 时仍可创建', async () => {
    const { useVrm } = await import('../../composables/useVrm')
    const { loadState, errorMsg } = useVrm({}, () => {})
    // onMounted won't trigger, so loadState stays at initial 'loading'
    expect(loadState.value).toBe('loading')
    expect(errorMsg.value).toBe('')
  })

  it('subscribeVrmSpeech 订阅被注册（composable 创建不报错）', async () => {
    // subscribeVrmSpeech is called at composable top level, will immediately trigger a callback
    // If registration succeeds, composable should return normally
    const { useVrm } = await import('../../composables/useVrm')
    const result = useVrm({ modelUrl: 'http://example.com/model.vrm' }, () => {})
    expect(result).toBeDefined()
    expect(result.canvasRef).toBeDefined()
    expect(result.loadState).toBeDefined()
    expect(result.close).toBeTypeOf('function')
  })
})
