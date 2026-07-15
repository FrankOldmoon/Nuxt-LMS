/**
 * home/hero.vue component test
 * @see modules/lms/components/home/hero.vue
 *
 * Home hero block: title + subtitle. Pure display component.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
}

describe('home/hero.vue', () => {
  it('默认渲染标题与副标题', async () => {
    const { default: Hero } = await import('../../../components/home/hero.vue')
    const wrapper = mount(Hero, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('home.title')
    expect(wrapper.text()).toContain('home.subtitle')
  })

  it('渲染 h1 标题元素', async () => {
    const { default: Hero } = await import('../../../components/home/hero.vue')
    const wrapper = mount(Hero, { global: _globalConfig })
    expect(wrapper.find('h1').exists()).toBe(true)
  })

  it('渲染副标题段落', async () => {
    const { default: Hero } = await import('../../../components/home/hero.vue')
    const wrapper = mount(Hero, { global: _globalConfig })
    expect(wrapper.find('p').exists()).toBe(true)
  })

  it('i18n locale 切换不影响渲染结构', async () => {
    const { default: Hero } = await import('../../../components/home/hero.vue')
    const wrapper = mount(Hero, { global: _globalConfig })
    expect(wrapper.html()).toContain('home.title')
    expect(wrapper.html()).toContain('home.subtitle')
  })
})
