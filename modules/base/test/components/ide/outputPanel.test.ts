/**
 * IdeOutputPanel 组件测试
 * @see modules/base/components/ide/outputPanel.vue
 *
 * 输出面板：展示代码运行输出文本
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

const _globalStubs = {
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('ide/outputPanel.vue', () => {
  it('默认渲染：包含标题和输出区域', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const wrapper = mount(IdeOutputPanel, {
      props: { output: '' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('ide.output')
    expect(wrapper.find('pre').exists()).toBe(true)
  })

  it('output prop 渲染到 pre 元素中', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const wrapper = mount(IdeOutputPanel, {
      props: { output: 'Hello, World!\nLine 2' },
      global: _globalConfig,
    })
    const pre = wrapper.find('pre')
    expect(pre.text()).toBe('Hello, World!\nLine 2')
  })

  it('output 为空字符串时 pre 内容为空', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const wrapper = mount(IdeOutputPanel, {
      props: { output: '' },
      global: _globalConfig,
    })
    expect(wrapper.find('pre').text()).toBe('')
  })

  it('output 更新后内容同步变化', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const wrapper = mount(IdeOutputPanel, {
      props: { output: 'initial' },
      global: _globalConfig,
    })
    expect(wrapper.find('pre').text()).toBe('initial')
    await wrapper.setProps({ output: 'updated output' })
    expect(wrapper.find('pre').text()).toBe('updated output')
  })

  it('保留 output 中的换行与空白（white-space: pre-wrap）', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const multiLine = 'line1\n  indented\n\nblank above'
    const wrapper = mount(IdeOutputPanel, {
      props: { output: multiLine },
      global: _globalConfig,
    })
    expect(wrapper.find('pre').text()).toBe(multiLine)
  })

  it('包含 ide.output 标题文案', async () => {
    const { default: IdeOutputPanel } = await import('../../../components/ide/outputPanel.vue')
    const wrapper = mount(IdeOutputPanel, {
      props: { output: '' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ide.output')
  })
})
