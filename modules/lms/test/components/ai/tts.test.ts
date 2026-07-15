/**
 * ai/tts.vue component test
 * @see modules/lms/components/ai/tts.vue
 *
 * Text-to-speech component: text input, language/voice/gender selection, rate/pitch/volume sliders, play/pause/stop buttons.
 * Logic provided by useTts() composable, imports real composable and exposes to globalThis in tests.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { useTts } from '../../../composables/useTts'

;(globalThis as any).useTts = useTts

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: {},
}

describe('ai/tts.vue', () => {
  it('默认渲染：包含文本框、语言/语音/性别选择、滑块、播放按钮', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    // Text input textarea
    expect(wrapper.find('textarea').exists()).toBe(true)
    // 3 selects (language / voice / gender)
    expect(wrapper.findAll('select').length).toBe(3)
    // 3 range sliders (rate / pitch / volume)
    expect(wrapper.findAll('input[type="range"]').length).toBe(3)
    // Play button
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('默认无文本时播放按钮 disabled', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    const playBtn = wrapper.find('button')
    expect((playBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('输入文本后播放按钮启用', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    const ta = wrapper.find('textarea')
    await ta.setValue('你好世界')
    const playBtn = wrapper.find('button')
    expect((playBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('播放按钮文案默认为"播放"', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    expect(wrapper.find('button').text()).toContain('播放')
  })

  it('性别下拉包含女声/男声选项', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    // The 3rd select is gender
    const selects = wrapper.findAll('select')
    const genderSelect = selects[2]
    const opts = genderSelect.findAll('option')
    expect(opts.length).toBe(2)
    expect(genderSelect.text()).toContain('女声')
    expect(genderSelect.text()).toContain('男声')
  })

  it('语言下拉包含 languageMap 中的语言', async () => {
    const { default: Tts } = await import('../../../components/ai/tts.vue')
    const wrapper = mount(Tts, { global: _globalConfig })
    const langSelect = wrapper.findAll('select')[0]
    expect(langSelect.findAll('option').length).toBeGreaterThan(1)
  })
})
