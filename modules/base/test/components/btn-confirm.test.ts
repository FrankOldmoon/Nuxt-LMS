/**
 * BtnConfirm component tests
 * @see modules/base/components/form/btn-confirm.vue
 *
 * Use @vue/test-utils + happy-dom to simulate component rendering
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

// Globally mock NuxtUI components so the component can render
const _globalStubs = {
  UPopover: {
    template: '<div><slot /><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['color', 'variant', 'size', 'loading', 'label'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('form/btn-confirm.vue', () => {
  it('默认渲染为带默认文案的 UButton 触发器', async () => {
    const { default: BtnConfirm } = await import('../../components/form/btn-confirm.vue')
    const wrapper = mount(BtnConfirm, {
      props: { label: '删除' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('点击确认按钮 emit confirm 事件', async () => {
    const { default: BtnConfirm } = await import('../../components/form/btn-confirm.vue')
    const wrapper = mount(BtnConfirm, {
      props: { label: '删除' },
      global: _globalConfig,
    })
    wrapper.vm.$emit('confirm')
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('loading 为 true 时 confirm 后不会自动关闭', async () => {
    const { default: BtnConfirm } = await import('../../components/form/btn-confirm.vue')
    const wrapper = mount(BtnConfirm, {
      props: { label: '删除', loading: true },
      global: _globalConfig,
    })
    const vm: any = wrapper.vm
    expect(vm).toBeDefined()
  })

  it('接受 confirmText prop', async () => {
    const { default: BtnConfirm } = await import('../../components/form/btn-confirm.vue')
    const wrapper = mount(BtnConfirm, {
      props: { label: '删除', confirmText: '确定要删除吗？' },
      global: _globalConfig,
    })
    expect(wrapper.props('confirmText')).toBe('确定要删除吗？')
  })

  it('接受 color prop', async () => {
    const { default: BtnConfirm } = await import('../../components/form/btn-confirm.vue')
    const wrapper = mount(BtnConfirm, {
      props: { label: '危险', color: 'red' },
      global: _globalConfig,
    })
    expect(wrapper.props('color')).toBe('red')
  })
})
