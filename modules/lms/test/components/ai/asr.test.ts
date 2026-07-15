/**
 * ai/asr.vue component test
 * @see modules/lms/components/ai/asr.vue
 *
 * Speech recognition component: language selection, continuous/intermediate result switches, start/stop buttons, recognition result area, clear/copy buttons.
 * Logic provided by useAsr() composable, imports real composable and exposes to globalThis in tests.
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
    // Language selection select
    const langSelect = wrapper.find('select')
    expect(langSelect.exists()).toBe(true)
    // Two checkboxes (continuous recognition / show intermediate results)
    expect(wrapper.findAll('input[type="checkbox"]').length).toBe(2)
    // Start recognition button
    const btns = wrapper.findAll('button')
    expect(btns.length).toBeGreaterThanOrEqual(3) // Start + clear + copy
  })

  it('语言下拉包含 languageMap 中的语言选项', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    const options = wrapper.find('select').findAll('option')
    // languageMap contains at least zh-CN / en-US and other languages
    expect(options.length).toBeGreaterThan(1)
  })

  it('默认状态显示"开始识别"按钮文案', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    // The first button is the start/stop recognition button
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
    // The last two buttons are clear / copy
    const clearBtn = btns[btns.length - 2]
    const copyBtn = btns[btns.length - 1]
    expect((clearBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect((copyBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('isSupported=false 时显示不支持提示', async () => {
    const { default: Asr } = await import('../../../components/ai/asr.vue')
    const wrapper = mount(Asr, { global: _globalConfig })
    // happy-dom has no SpeechRecognition → isSupported=false
    expect(wrapper.text()).toContain('Web Speech API')
  })
})
