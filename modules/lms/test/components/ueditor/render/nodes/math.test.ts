/**
 * ueditor/render/nodes/math.vue component test
 * @see modules/lms/components/ueditor/render/nodes/math.vue
 *
 * KaTeX is dynamically loaded from CDN in test environment, window.katex is unavailable, html is empty,
 * Component should fall back to error class.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/math.vue', () => {
  it('renders block math as a div with error class (no katex)', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'blockMath', attrs: { latex: 'c^2 = a^2 + b^2' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('div').exists()).toBe(true)
    expect(wrapper.html()).toContain('block-math-error')
  })

  it('renders inline math as a span with error class', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'inlineMath', attrs: { latex: 'E=mc^2' } } },
      global: _globalConfig,
    })
    expect(wrapper.find('span').exists()).toBe(true)
    expect(wrapper.html()).toContain('inline-math-error')
  })

  it('binds data-latex attribute', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'blockMath', attrs: { latex: '\\pi' } } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('data-latex="\\pi"')
  })
})
