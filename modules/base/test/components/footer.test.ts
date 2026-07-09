/**
 * Footer 组件测试
 * @see modules/base/components/layout/footer.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

const _globalStubs = {
  UFooter: {
    template: '<footer><slot name="left" /><slot /></footer>',
  },
}

describe('layout/footer.vue', () => {
  it('渲染为 UFooter 容器', async () => {
    const { default: Footer } = await import('../../components/layout/footer.vue')
    const wrapper = mount(Footer, { global: { stubs: _globalStubs } })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('footer')
  })

  it('显示当前年份', async () => {
    const { default: Footer } = await import('../../components/layout/footer.vue')
    const wrapper = mount(Footer, { global: { stubs: _globalStubs } })
    const year = new Date().getFullYear()
    expect(wrapper.html()).toContain(String(year))
  })

  it('包含 "AI LMS" 标识', async () => {
    const { default: Footer } = await import('../../components/layout/footer.vue')
    const wrapper = mount(Footer, { global: { stubs: _globalStubs } })
    expect(wrapper.html()).toContain('AI LMS')
  })
})
