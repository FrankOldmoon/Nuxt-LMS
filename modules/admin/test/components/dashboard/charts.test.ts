/**
 * dashboard/Charts.vue 组件测试
 * @see modules/admin/components/dashboard/Charts.vue
 *
 * 仪表盘图表：用户增长（折线）+ 角色分布（饼）+ 内容分布（柱）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClientOnly: {
    template: '<div class="client-only"><slot /><slot name="fallback" /></div>',
  },
  // 组件模板已改用 <LazyChart>（defineAsyncComponent，避免 echarts 进入共享 chunk），
  // 测试环境无 Nuxt 自动导入，两个名字都给出桩
  Chart: { template: '<div class="chart">{{ option?.title?.text }}</div>', props: ['option', 'height'] },
  LazyChart: { template: '<div class="chart">{{ option?.title?.text }}</div>', props: ['option', 'height'] },
  USkeleton: { template: '<div class="uskeleton" />', props: ['class'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('dashboard/Charts.vue', () => {
  const sampleStats = {
    counts: { courses: 10, chapters: 30, questions: 100, homeworks: 50, quizzes: 20, races: 5, comments: 200 },
    userGrowth: [
      { date: '2026-01-01', count: 10 },
      { date: '2026-01-02', count: 15 },
    ],
    roleDistribution: [
      { name: 'admin', value: 2 },
      { name: 'teacher', value: 5 },
      { name: 'student', value: 100 },
    ],
  }

  it('渲染 3 个图表容器', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.chart').length).toBe(3)
  })

  it('渲染用户增长图表标题', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.stats.userGrowth')
  })

  it('渲染角色分布图表标题', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.stats.roleDistribution')
  })

  it('渲染内容分布图表标题', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('admin.stats.contentDistribution')
  })

  it('stats=null 时仍渲染图表容器（option 中 data 为空）', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: null },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.chart').length).toBe(3)
  })

  it('正确接收 stats prop', async () => {
    const { default: Charts } = await import('../../../components/dashboard/Charts.vue')
    const wrapper = mount(Charts, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.props('stats')).toStrictEqual(sampleStats)
  })
})
