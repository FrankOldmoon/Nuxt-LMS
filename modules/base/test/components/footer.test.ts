/**
 * Footer 组件测试
 * @see modules/base/components/layout/footer.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

function stubSiteConfig(footerText: string) {
  ;(globalThis as any).useSiteConfig = () => ({ config: ref({ siteFooterText: footerText }) })
}

beforeEach(() => {
  resetAllStubs()
  stubSiteConfig('')
})

const _globalStubs = {
  UFooter: {
    template: '<footer><slot name="left" /><slot /></footer>',
  },
}

describe('layout/footer.vue', () => {
  it('siteFooterText 为空时渲染空 Footer（不显示内容）', async () => {
    stubSiteConfig('')
    const { default: Footer } = await import('../../components/layout/footer.vue')
    const wrapper = mount(Footer, { global: { stubs: _globalStubs } })
    expect(wrapper.findAll('*').length).toBe(0)
  })

  it('渲染 siteFooterText 内容', async () => {
    stubSiteConfig('© 2026 My Platform.')
    const { default: Footer } = await import('../../components/layout/footer.vue')
    const wrapper = mount(Footer, { global: { stubs: _globalStubs } })
    expect(wrapper.text()).toContain('© 2026 My Platform.')
  })
})