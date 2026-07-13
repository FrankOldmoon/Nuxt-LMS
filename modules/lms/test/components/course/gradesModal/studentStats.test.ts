/**
 * course/gradesModal/studentStats.vue 组件测试
 * @see modules/lms/components/course/gradesModal/studentStats.vue
 *
 * 学生端学习统计 + 能力雷达图
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
  ClientOnly: { template: '<div class="client-only"><slot /></div>' },
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const ctx = {
    statCards: ref([
      { label: '总得分', value: 85 },
      { label: '通过章节', value: 5 },
    ]),
    radarOption: ref({ title: { text: 'radar' } }),
    ...overrides,
  }
  ;(globalThis as any).useGradesContext = () => ctx
  return ctx
}

describe('course/gradesModal/studentStats.vue', () => {
  it('渲染学习统计标题', async () => {
    setupContext()
    const { default: StudentStats } = await import('../../../../components/course/gradesModal/studentStats.vue')
    const wrapper = mount(StudentStats, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.learningStats')
  })

  it('渲染统计卡片', async () => {
    setupContext()
    const { default: StudentStats } = await import('../../../../components/course/gradesModal/studentStats.vue')
    const wrapper = mount(StudentStats, { global: _globalConfig })
    expect(wrapper.text()).toContain('总得分')
    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain('通过章节')
    expect(wrapper.text()).toContain('5')
  })

  it('渲染能力标题', async () => {
    setupContext()
    const { default: StudentStats } = await import('../../../../components/course/gradesModal/studentStats.vue')
    const wrapper = mount(StudentStats, { global: _globalConfig })
    expect(wrapper.text()).toContain('coursePanel.ability')
  })

  it('渲染 Chart 组件', async () => {
    setupContext()
    const { default: StudentStats } = await import('../../../../components/course/gradesModal/studentStats.vue')
    const wrapper = mount(StudentStats, { global: _globalConfig })
    expect(wrapper.find('.chart').exists()).toBe(true)
  })

  it('渲染多个统计卡片', async () => {
    setupContext({
      statCards: ref([
        { label: 'A', value: 1 },
        { label: 'B', value: 2 },
        { label: 'C', value: 3 },
        { label: 'D', value: 4 },
        { label: 'E', value: 5 },
      ]),
    })
    const { default: StudentStats } = await import('../../../../components/course/gradesModal/studentStats.vue')
    const wrapper = mount(StudentStats, { global: _globalConfig })
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('C')
    expect(wrapper.text()).toContain('D')
    expect(wrapper.text()).toContain('E')
  })
})
