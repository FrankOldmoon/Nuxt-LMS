/**
 * dashboard/StatCards.vue 组件测试
 * @see modules/admin/components/dashboard/StatCards.vue
 *
 * 统计卡片：骨架（stats=null）+ 统计数值卡片
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USkeleton: { template: '<div class="uskeleton" />', props: ['class'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('dashboard/StatCards.vue', () => {
  const sampleStats = {
    counts: { users: 100, courses: 20, chapters: 50, questions: 200 },
    newUsers7d: 5,
    newUsers30d: 15,
  }

  it('stats=null 时渲染骨架', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: null },
      global: _globalConfig,
    })
    expect(wrapper.findAll('.uskeleton').length).toBe(8)
  })

  it('stats 有值时渲染卡片', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    // 10 张卡片（8 counts + 2 newUsers）
    const cards = wrapper.findAll('.p-4.rounded-lg')
    expect(cards.length).toBe(10)
  })

  it('渲染正确的用户数', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('100')
  })

  it('渲染正确的课程数', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('20')
  })

  it('counts 缺失字段时回退为 0', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: { counts: { users: 5 }, newUsers7d: 0, newUsers30d: 0 } },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('5')
    // courses 回退 0
    expect(wrapper.text()).toContain('0')
  })

  it('正确接收 stats prop', async () => {
    const { default: StatCards } = await import('../../../components/dashboard/StatCards.vue')
    const wrapper = mount(StatCards, {
      props: { stats: sampleStats },
      global: _globalConfig,
    })
    expect(wrapper.props('stats')).toStrictEqual(sampleStats)
  })
})
