/**
 * useVrm composable 测试
 * @see modules/lms/composables/useVrm.ts
 *
 * 注意：useVrm 的核心逻辑（CDN 加载、Three.js 场景、VRM 模型加载）在 onMounted 中执行，
 * 测试环境无 active component instance，onMounted 不会触发。
 * 因此仅测试同步部分：初始 refs、close()、t 函数、subscribeVrmSpeech 订阅注册。
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
    // onMounted 不会触发，所以 loadState 保持初始 'loading'
    expect(loadState.value).toBe('loading')
    expect(errorMsg.value).toBe('')
  })

  it('subscribeVrmSpeech 订阅被注册（composable 创建不报错）', async () => {
    // subscribeVrmSpeech 在 composable 顶层调用，会立即触发一次回调
    // 如果注册成功，composable 应正常返回
    const { useVrm } = await import('../../composables/useVrm')
    const result = useVrm({ modelUrl: 'http://example.com/model.vrm' }, () => {})
    expect(result).toBeDefined()
    expect(result.canvasRef).toBeDefined()
    expect(result.loadState).toBeDefined()
    expect(result.close).toBeTypeOf('function')
  })
})
