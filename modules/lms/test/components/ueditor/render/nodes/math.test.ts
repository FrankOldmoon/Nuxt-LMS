/**
 * ueditor/render/nodes/math.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/math.vue
 *
 * KaTeX 已从 CDN 改为本地 npm 依赖，测试环境可直接渲染出 katex 标记；
 * 只有 latex 为空（或渲染抛错）时才回退到 *-math-error 容器类。
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
  it('renders block math as a div with katex markup', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'blockMath', attrs: { latex: 'c^2 = a^2 + b^2' } } },
      global: _globalConfig,
    })
    const el = wrapper.find('div')
    expect(el.exists()).toBe(true)
    expect(el.attributes('data-type')).toBe('block-math')
    expect(el.classes()).toContain('tiptap-mathematics-render')
    expect(wrapper.html()).toContain('katex')
  })

  it('renders inline math as a span with katex markup', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'inlineMath', attrs: { latex: 'E=mc^2' } } },
      global: _globalConfig,
    })
    const el = wrapper.find('span')
    expect(el.exists()).toBe(true)
    expect(el.attributes('data-type')).toBe('inline-math')
    expect(el.classes()).toContain('tiptap-mathematics-render')
    expect(wrapper.html()).toContain('katex')
  })

  it('falls back to error class when latex is empty', async () => {
    const { default: MathView } = await import('../../../../../components/ueditor/render/nodes/math.vue')
    const wrapper = mount(MathView, {
      props: { node: { type: 'blockMath', attrs: { latex: '' } } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('block-math-error')
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
