/**
 * lms/configEditor/expSections.vue 组件测试
 * @see modules/lms/components/lms/configEditor/expSections.vue
 *
 * 经验值配置区域：7 个 section（question/homework/comment/chapter/race/quiz/general）
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
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'size'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :step="step" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'step', 'size'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext() {
  const config = reactive({
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    homework: { submitExp: 5, resubmitExp: 1, latePenalty: 0.8 },
    comment: { publishExp: 3, replyExp: 2, likeReceivedExp: 1, maxDailyExp: 20 },
    chapter: { headingExp: 5, headingCoin: 5, headingScore: 5 },
    race: { participateExp: 10, rank1Exp: 100, rank2Exp: 80, rank3Exp: 60 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
    general: { dailyExpCap: 100, levelStep: 100 },
  })
  ;(globalThis as any).useConfigEditorContext = () => ({ config })
  return config
}

describe('lms/configEditor/expSections.vue', () => {
  it('渲染所有 7 个 section 标题', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.question')
    expect(wrapper.text()).toContain('lmsConfig.homework')
    expect(wrapper.text()).toContain('lmsConfig.comment')
    expect(wrapper.text()).toContain('lmsConfig.chapter')
    expect(wrapper.text()).toContain('lmsConfig.race')
    expect(wrapper.text()).toContain('lmsConfig.quiz')
    expect(wrapper.text()).toContain('lmsConfig.general')
  })

  it('渲染 question section 的 4 个字段', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.submitExp')
    expect(wrapper.text()).toContain('lmsConfig.correctBonusExp')
    expect(wrapper.text()).toContain('lmsConfig.firstCorrectBonusExp')
    expect(wrapper.text()).toContain('lmsConfig.maxSubmitCount')
  })

  it('渲染 homework section 的 2 个字段', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.submitExp')
    expect(wrapper.text()).toContain('lmsConfig.resubmitExp')
    // latePenalty 已移除（作业无截止时间，从未生效）
    expect(wrapper.text()).not.toContain('lmsConfig.latePenalty')
  })

  it('渲染 comment section 的 4 个字段', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.publishExp')
    expect(wrapper.text()).toContain('lmsConfig.replyExp')
    expect(wrapper.text()).toContain('lmsConfig.likeReceivedExp')
    expect(wrapper.text()).toContain('lmsConfig.maxDailyExp')
  })

  it('渲染 general section 的 2 个字段', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.dailyExpCap')
    expect(wrapper.text()).toContain('lmsConfig.levelStep')
  })

  it('渲染 UInput 数字输入框', async () => {
    setupContext()
    const { default: ExpSections } = await import('../../../../components/lms/configEditor/expSections.vue')
    const wrapper = mount(ExpSections, { global: _globalConfig })
    const inputs = wrapper.findAll('.uinput')
    // 4+2+4+3+4+3+2 = 22 个输入框（homework 段移除 latePenalty）
    expect(inputs.length).toBe(22)
    // 都是 number 类型
    expect(inputs[0]!.attributes('type')).toBe('number')
  })
})
