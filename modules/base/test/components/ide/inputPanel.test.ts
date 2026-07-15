/**
 * IdeInputPanel component tests
 * @see modules/base/components/ide/inputPanel.vue
 *
 * Input panel: textarea for users to input stdin
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

describe('ide/inputPanel.vue', () => {
  it('默认渲染：包含标题和 textarea', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('ide.input')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('textarea 默认值为空（defineModel default）', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      global: _globalConfig,
    })
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('通过 input prop 设置初始值', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      props: { input: '5\n10\n' },
      global: _globalConfig,
    })
    expect(wrapper.find('textarea').element.value).toBe('5\n10\n')
  })

  it('textarea 输入时 emit update:input 事件', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      props: { input: '' },
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello stdin')
    expect(wrapper.emitted('update:input')).toBeTruthy()
    expect(wrapper.emitted('update:input')![0]).toEqual(['hello stdin'])
  })

  it('input prop 更新后 textarea 值同步变化', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      props: { input: 'old' },
      global: _globalConfig,
    })
    expect(wrapper.find('textarea').element.value).toBe('old')
    await wrapper.setProps({ input: 'new input' })
    expect(wrapper.find('textarea').element.value).toBe('new input')
  })

  it('包含 ide.inputPlaceholder 占位符文案', async () => {
    const { default: IdeInputPanel } = await import('../../../components/ide/inputPanel.vue')
    const wrapper = mount(IdeInputPanel, {
      global: _globalConfig,
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('ide.inputPlaceholder')
  })
})
