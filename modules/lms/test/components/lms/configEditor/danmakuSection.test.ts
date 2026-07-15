/**
 * lms/configEditor/danmakuSection.vue component test
 * @see modules/lms/components/lms/configEditor/danmakuSection.vue
 *
 * Class danmaku broadcast config after submit: 6 switches
 * - enableOnQuestion / enableOnHomework / enableOnQuiz / enableOnComment
 * - questionOnlyOnCorrect / onlyOnReward
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USwitch: {
    template: '<label class="uswitch"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
    props: ['modelValue'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext() {
  const config = reactive({
    danmaku: {
      enableOnQuestion: true,
      enableOnHomework: true,
      enableOnQuiz: true,
      enableOnComment: true,
      questionOnlyOnCorrect: true,
      onlyOnReward: true,
    },
  })
  ;(globalThis as any).useConfigEditorContext = () => ({ config })
  return config
}

describe('lms/configEditor/danmakuSection.vue', () => {
  it('渲染 section 标题', async () => {
    setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.danmaku')
  })

  it('渲染 section 提示文本', async () => {
    setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.danmakuHint')
  })

  it('渲染所有 6 个开关字段的 label', async () => {
    setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.enableOnQuestion')
    expect(wrapper.text()).toContain('lmsConfig.enableOnHomework')
    expect(wrapper.text()).toContain('lmsConfig.enableOnQuiz')
    expect(wrapper.text()).toContain('lmsConfig.enableOnComment')
    expect(wrapper.text()).toContain('lmsConfig.questionOnlyOnCorrect')
    expect(wrapper.text()).toContain('lmsConfig.onlyOnReward')
  })

  it('渲染所有 6 个开关字段的 hint', async () => {
    setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.enableOnQuestionHint')
    expect(wrapper.text()).toContain('lmsConfig.enableOnHomeworkHint')
    expect(wrapper.text()).toContain('lmsConfig.enableOnQuizHint')
    expect(wrapper.text()).toContain('lmsConfig.enableOnCommentHint')
    expect(wrapper.text()).toContain('lmsConfig.questionOnlyOnCorrectHint')
    expect(wrapper.text()).toContain('lmsConfig.onlyOnRewardHint')
  })

  it('渲染 6 个 USwitch 开关', async () => {
    setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    expect(wrapper.findAll('.uswitch').length).toBe(6)
  })

  it('切换 enableOnQuestion 触发 config 更新', async () => {
    const config = setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    const checkbox = wrapper.findAll('.uswitch input')[0]
    await checkbox.setValue(false)
    expect(config.danmaku.enableOnQuestion).toBe(false)
  })

  it('切换 questionOnlyOnCorrect 触发 config 更新', async () => {
    const config = setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    // The 5th switch is questionOnlyOnCorrect
    const checkbox = wrapper.findAll('.uswitch input')[4]
    await checkbox.setValue(false)
    expect(config.danmaku.questionOnlyOnCorrect).toBe(false)
  })

  it('切换 onlyOnReward 触发 config 更新', async () => {
    const config = setupContext()
    const { default: DanmakuSection } = await import('../../../../components/lms/configEditor/danmakuSection.vue')
    const wrapper = mount(DanmakuSection, { global: _globalConfig })
    // The 6th switch is onlyOnReward
    const checkbox = wrapper.findAll('.uswitch input')[5]
    await checkbox.setValue(false)
    expect(config.danmaku.onlyOnReward).toBe(false)
  })
})
