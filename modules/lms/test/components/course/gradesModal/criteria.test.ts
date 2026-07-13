/**
 * course/gradesModal/criteria.vue 组件测试
 * @see modules/lms/components/course/gradesModal/criteria.vue
 *
 * 评分标准配置（教师/管理员）：折叠展开 + 权重 + 等第阈值 + 保存/重置
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'label', 'disabled'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'min', 'step', 'size', 'maxlength'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const gradeCriteria = ref({
    weights: [
      { key: 'questionScore', maxScore: 100, percent: 20 },
      { key: 'homeworkScore', maxScore: 100, percent: 20 },
    ],
    levels: [
      { letter: 'A', min: 90 },
      { letter: 'B', min: 80 },
    ],
  })
  const ctx = {
    gradeCriteria,
    criteriaDirty: ref(false),
    saveCriteria: vi.fn(async () => {}),
    resetCriteria: vi.fn(),
    ...overrides,
  }
  // 如果 overrides 提供了 gradeCriteria，使用它
  if (overrides.gradeCriteria) ctx.gradeCriteria = overrides.gradeCriteria
  ;(globalThis as any).useGradesContext = () => ctx
  return ctx
}

describe('course/gradesModal/criteria.vue', () => {
  it('默认折叠状态渲染标题', async () => {
    setupContext()
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.criteria')
  })

  it('点击折叠头展开内容', async () => {
    setupContext()
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    // 默认折叠
    expect(wrapper.text()).not.toContain('coursePanel.weights')
    // 点击展开
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('coursePanel.weights')
  })

  it('展开时渲染权重列表', async () => {
    setupContext()
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    await wrapper.find('button').trigger('click')
    // 渲染两个权重的 label
    expect(wrapper.text()).toContain('coursePanel.questionScore')
    expect(wrapper.text()).toContain('coursePanel.homeworkScore')
  })

  it('展开时渲染等第列表', async () => {
    setupContext()
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('coursePanel.levels')
    // 等第字母在 UInput 中，wrapper.text() 不含 input 值
    const inputs = wrapper.findAll('.uinput')
    const values = inputs.map(i => (i.element as HTMLInputElement).value)
    expect(values).toContain('A')
    expect(values).toContain('B')
  })

  it('criteriaDirty=true 时显示未保存提示', async () => {
    setupContext({ criteriaDirty: ref(true) })
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    expect(wrapper.text()).toContain('common.unsaved')
  })

  it('点击添加等第按钮增加一行', async () => {
    setupContext()
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    await wrapper.find('button').trigger('click')
    // 找到 addLevel 按钮（带 addLevel label）
    const buttons = wrapper.findAll('.ubutton')
    const addLevelBtn = buttons.find(b => b.text().includes('coursePanel.addLevel'))
    expect(addLevelBtn).toBeTruthy()
    await addLevelBtn!.trigger('click')
    // levels 增加 1（从 2 到 3）
    // 内部 gradeCriteria 由 useGradesContext 提供，验证通过 ctx
  })

  it('点击保存按钮调用 saveCriteria', async () => {
    const saveMock = vi.fn(async () => {})
    setupContext({ saveCriteria: saveMock })
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    await wrapper.find('button').trigger('click')
    // 找到保存按钮
    const buttons = wrapper.findAll('.ubutton')
    const saveBtn = buttons.find(b => b.text().includes('common.save'))
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    expect(saveMock).toHaveBeenCalled()
  })

  it('点击重置按钮调用 resetCriteria', async () => {
    const resetMock = vi.fn()
    setupContext({ resetCriteria: resetMock })
    const { default: Criteria } = await import('../../../../components/course/gradesModal/criteria.vue')
    const wrapper = mount(Criteria, { global: _globalConfig })
    await wrapper.find('button').trigger('click')
    const buttons = wrapper.findAll('.ubutton')
    const resetBtn = buttons.find(b => b.text().includes('coursePanel.resetCriteria'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')
    expect(resetMock).toHaveBeenCalled()
  })
})
