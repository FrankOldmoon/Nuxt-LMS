/**
 * layout/toc/list.vue 组件测试
 * @see modules/lms/components/layout/toc/list.vue
 *
 * 目录列表：递归渲染 TOC links（支持三级），点击跳转。
 * 使用 useList(props)（来自 ./useList.ts），内部依赖 useChapterTask。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useChapterTask（auto-import）— 返回 null 表示不在章节页
  ;(globalThis as any).useChapterTask = () => null
})

const _globalStubs = {
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('layout/toc/list.vue', () => {
  it('links 为空时不渲染列表', async () => {
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links: [] },
      global: _globalConfig,
    })
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('渲染一级标题链接', async () => {
    const links = [
      { id: 'h1', text: 'Heading 1' },
      { id: 'h2', text: 'Heading 2' },
    ]
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links },
      global: _globalConfig,
    })
    const items = wrapper.findAll('nav > ul > li')
    expect(items.length).toBe(2)
    expect(wrapper.text()).toContain('Heading 1')
    expect(wrapper.text()).toContain('Heading 2')
  })

  it('渲染嵌套子标题', async () => {
    const links = [
      {
        id: 'h1', text: 'Heading 1',
        children: [{ id: 'h1-1', text: 'Sub Heading' }],
      },
    ]
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Sub Heading')
  })

  it('渲染三级标题', async () => {
    const links = [
      {
        id: 'h1', text: 'H1',
        children: [{
          id: 'h1-1', text: 'H1-1',
          children: [{ id: 'h1-1-1', text: 'Grand Heading' }],
        }],
      },
    ]
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Grand Heading')
  })

  it('链接 href 指向 #id', async () => {
    const links = [{ id: 'intro', text: 'Introduction' }]
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links },
      global: _globalConfig,
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('#intro')
  })

  it('title prop 渲染标题', async () => {
    const { default: TocList } = await import('../../../../components/layout/toc/list.vue')
    const wrapper = mount(TocList, {
      props: { links: [{ id: 'h1', text: 'H1' }], title: 'Contents' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Contents')
  })
})
