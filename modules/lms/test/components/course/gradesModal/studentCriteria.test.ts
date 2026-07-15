/**
 * course/gradesModal/studentCriteria.vue component test
 * @see modules/lms/components/course/gradesModal/studentCriteria.vue
 *
 * Student-side grading criteria display (read-only): weights + grade levels
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

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

function setupContext(overrides: any = {}) {
  const effectiveCriteria = ref({
    weights: [
      { key: 'questionScore', maxScore: 100, percent: 20 },
      { key: 'homeworkScore', maxScore: 100, percent: 30 },
    ],
    levels: [
      { letter: 'A', min: 90 },
      { letter: 'B', min: 80 },
      { letter: 'C', min: 70 },
    ],
  })
  const ctx = {
    effectiveCriteria,
    ...overrides,
  }
  if (overrides.effectiveCriteria) ctx.effectiveCriteria = overrides.effectiveCriteria
  ;(globalThis as any).useGradesContext = () => ctx
  return ctx
}

describe('course/gradesModal/studentCriteria.vue', () => {
  it('默认展开渲染标题', async () => {
    setupContext()
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.criteria')
  })

  it('默认展开渲染权重列表', async () => {
    setupContext()
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.weights')
    expect(wrapper.text()).toContain('coursePanel.questionScore')
    expect(wrapper.text()).toContain('coursePanel.homeworkScore')
  })

  it('渲染百分比之和', async () => {
    setupContext()
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    // 20 + 30 = 50
    expect(wrapper.text()).toContain('50%')
  })

  it('渲染等第列表', async () => {
    setupContext()
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.levels')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('C')
  })

  it('点击折叠头可收起内容', async () => {
    setupContext()
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    // Expanded by default
    expect(wrapper.text()).toContain('coursePanel.weights')
    // Click to collapse
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).not.toContain('coursePanel.weights')
  })

  it('等第按 min 降序排列', async () => {
    setupContext({
      effectiveCriteria: ref({
        weights: [],
        levels: [
          { letter: 'C', min: 70 },
          { letter: 'A', min: 90 },
          { letter: 'B', min: 80 },
        ],
      }),
    })
    const { default: StudentCriteria } = await import('../../../../components/course/gradesModal/studentCriteria.vue')
    const wrapper = mount(StudentCriteria, { global: _globalConfig })
    const text = wrapper.text()
    // A (90) should come before B (80), B should come before C (70)
    const aIdx = text.indexOf('A')
    const bIdx = text.indexOf('B')
    const cIdx = text.indexOf('C')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })
})
