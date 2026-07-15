/**
 * ueditor/render/nodes/code-block.vue component test
 * @see modules/lms/components/ueditor/render/nodes/code-block.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  IdeModal: { template: '<div class="ide-modal-stub" />', props: ['open', 'code', 'language'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: _globalStubs,
}

describe('ueditor/render/nodes/code-block.vue', () => {
  it('renders code block with language label and code', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: {
        node: {
          type: 'codeBlock',
          attrs: { language: 'javascript', theme: 'dark' },
          content: [{ type: 'text', text: 'const x = 1' }],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-wrapper').exists()).toBe(true)
    expect(wrapper.find('.cb-lang').text()).toBe('javascript')
    expect(wrapper.find('.cb-code').exists()).toBe(true)
  })

  it('shows run button for Python', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'python' }, content: [{ type: 'text', text: 'print(1)' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('shows run button for JavaScript', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'console.log(1)' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('shows run button for C++ and Java', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'cpp' }, content: [{ type: 'text', text: 'int main(){}' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(true)
  })

  it('does not show run button for plaintext', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: { language: 'plaintext' }, content: [{ type: 'text', text: 'hello' }] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-run').exists()).toBe(false)
  })

  it('defaults language to plaintext when not specified', async () => {
    const { default: CodeBlockView } = await import('../../../../../components/ueditor/render/nodes/code-block.vue')
    const wrapper = mount(CodeBlockView, {
      props: { node: { type: 'codeBlock', attrs: {}, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.cb-lang').text()).toBe('plaintext')
  })
})
