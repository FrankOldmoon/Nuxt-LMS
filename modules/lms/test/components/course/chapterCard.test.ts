/**
 * course/chapterCard.vue 组件测试
 * @see modules/lms/components/course/chapterCard.vue
 *
 * 章节卡片：含锁/通过图标 + 不可访问禁用
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  NuxtLink: {
    template: '<a :href="to" class="nuxt-link"><slot /></a>',
    props: ['to'],
  },
  UCard: {
    template: '<div class="ucard"><slot /></div>',
    props: ['class', 'ui'],
  },
  UIcon: {
    template: '<span class="uicon" :data-name="name" />',
    props: ['name'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/chapterCard.vue', () => {
  const baseItem = {
    id: 1,
    label: '第一章 Vue 基础',
    to: '/course/1/1',
    accessible: true,
    isPass: false,
  }

  it('渲染章节标题和编号', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: baseItem, index: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('第一章 Vue 基础')
    // 索引 0 → 编号 "01"
    expect(wrapper.text()).toContain('01')
  })

  it('渲染 NuxtLink 链接', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: baseItem, index: 2 },
      global: _globalConfig,
    })
    expect(wrapper.find('.nuxt-link').attributes('href')).toBe('/course/1/1')
    // 索引 2 → 编号 "03"
    expect(wrapper.text()).toContain('03')
  })

  it('accessible=false 时显示锁图标且链接禁用', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: { ...baseItem, accessible: false }, index: 0 },
      global: _globalConfig,
    })
    // 锁图标
    const lockIcon = wrapper.find('[data-name="i-lucide-lock"]')
    expect(lockIcon.exists()).toBe(true)
    // 链接 to 为 undefined
    expect(wrapper.find('.nuxt-link').attributes('href')).toBeUndefined()
  })

  it('isPass=true 时显示通过图标', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: { ...baseItem, isPass: true }, index: 0 },
      global: _globalConfig,
    })
    const passIcon = wrapper.find('[data-name="i-lucide-circle-check"]')
    expect(passIcon.exists()).toBe(true)
  })

  it('accessible=true 时显示箭头图标', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: baseItem, index: 0 },
      global: _globalConfig,
    })
    const arrowIcon = wrapper.find('[data-name="i-lucide-arrow-right"]')
    expect(arrowIcon.exists()).toBe(true)
  })

  it('编号采用两位补零格式', async () => {
    const { default: ChapterCard } = await import('../../../components/course/chapterCard.vue')
    const wrapper = mount(ChapterCard, {
      props: { item: baseItem, index: 9 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('10')
  })
})
