/**
 * ai/asr.vue 组件测试
 * @see modules/lms/components/ai/asr.vue
 *
 * 语音识别组件：语言选择、连续/中间结果开关、开始/停止按钮、识别结果区、清空/复制按钮。
 * 逻辑由 useAsr() composable 提供，测试中导入真实 composable 暴露到 globalThis。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { useAsr } from '../../../composables/useAsr'

;(globalThis as any).useAsr = useAsr

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('ai/asr.vue', () => {
  it('默认渲染：包含语言选择、开关、按钮、结果区', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    // 语言选择 select
    const langSelect = wrapper.find('select')
    expect(langSelect.exists()).toBe(true)
    // 两个 checkbox（连续识别 / 显示中间结果）
    expect(wrapper.findAll('input[type="checkbox"]').length).toBe(2)
    // 开始识别按钮
    const btns = wrapper.findAll('button')
    expect(btns.length).toBeGreaterThanOrEqual(3) // 开始 + 清空 + 复制
  })

  it('语言下拉包含 languageMap 中的语言选项', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    const options = wrapper.find('select').findAll('option')
    // languageMap 至少包含 zh-CN / en-US 等多种语言
    expect(options.length).toBeGreaterThan(1)
  })

  it('默认状态显示"开始识别"按钮文案', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    // 第一个 button 是开始/停止识别按钮
    expect(wrapper.find('button').text()).toContain('开始识别')
  })

  it('无识别结果时显示提示文案', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    expect(wrapper.text()).toContain('开始识别')
  })

  it('清空与复制按钮在无结果时 disabled', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    const btns = wrapper.findAll('button')
    // 最后两个按钮是清空 / 复制
    const clearBtn = btns[btns.length - 2]
    const copyBtn = btns[btns.length - 1]
    expect((clearBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect((copyBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('isSupported=false 时显示不支持提示', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    // happy-dom 无 SpeechRecognition → isSupported=false
    expect(wrapper.text()).toContain('Web Speech API')
  })
})
