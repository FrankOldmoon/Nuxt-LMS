/**
 * IdeModal 组件测试
 * @see modules/base/components/ide/modal.vue
 *
 * IDE 弹窗：UModal 包裹 Ide 组件，通过 v-model:open 控制显隐
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

// 桩 UModal（透传 open + 渲染 content slot）
const _globalStubs = {
  UModal: {
    template: '<div class="modal" :data-open="String(open)"><slot name="content" /></div>',
    props: ['open', 'ui'],
    emits: ['update:open'],
  },
  // 桩 Ide 子组件，避免递归加载 useIde
  Ide: {
    template: '<div class="ide-stub">{{ language }}:{{ modelValue }}</div>',
    props: ['modelValue', 'language'],
    emits: ['update:modelValue'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('ide/modal.vue', () => {
  it('默认渲染：open=false 时 UModal 仍挂载（由 UModal 控制显隐）', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: false, code: 'print(1)', language: 'python' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.find('.modal').attributes('data-open')).toBe('false')
  })

  it('open=true 时显示 content slot（含 Ide 组件）', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: true, code: 'print(1)', language: 'python' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').attributes('data-open')).toBe('true')
    expect(wrapper.find('.ide-stub').exists()).toBe(true)
  })

  it('code prop 传递给 Ide 子组件', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: true, code: 'console.log(42)', language: 'javascript' },
      global: _globalConfig,
    })
    await flushPromises()
    const ide = wrapper.find('.ide-stub')
    expect(ide.text()).toContain('console.log(42)')
  })

  it('language prop 传递给 Ide 子组件', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: true, code: '', language: 'cpp' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.ide-stub').text()).toContain('cpp')
  })

  it('open prop 默认为 false', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { code: '', language: 'python' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('open')).toBe(false)
  })

  it('code prop 默认为空字符串', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('code')).toBe('')
  })

  it('language prop 默认为 python', async () => {
    const { default: IdeModal } = await import('../../../components/ide/modal.vue')
    const wrapper = mount(IdeModal, {
      props: { open: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('language')).toBe('python')
  })
})
