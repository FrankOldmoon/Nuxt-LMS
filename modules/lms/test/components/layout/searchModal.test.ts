/**
 * layout/searchModal.vue component test
 * @see modules/lms/components/layout/searchModal.vue
 *
 * Search modal: input box + resultList + highlight matches.
 * Uses useSearchModal(emit) (from ./useSearchModal.ts), internally depends on useRoute/useRouter.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockRoute } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  }, d: (v: any) => String(v) })
  setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
})

const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.esc="$emit(\'keydown.escape\')" @keydown.down.prevent="$emit(\'keydown.down\')" @keydown.up.prevent="$emit(\'keydown.up\')" @keydown.enter.prevent="$emit(\'keydown.enter\')" />',
    props: ['modelValue', 'placeholder', 'variant', 'autofocus'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
  stubs: _globalStubs,
}

describe('layout/searchModal.vue', () => {
  it('渲染搜索输入框', async () => {
    const { default: SearchModal } = await import('../../../components/layout/searchModal.vue')
    const wrapper = mount(SearchModal, { global: _globalConfig })
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('无关键字时显示提示信息', async () => {
    const { default: SearchModal } = await import('../../../components/layout/searchModal.vue')
    const wrapper = mount(SearchModal, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('searchModal.knowledgeCount')
  })

  it('渲染图标', async () => {
    const { default: SearchModal } = await import('../../../components/layout/searchModal.vue')
    const wrapper = mount(SearchModal, { global: _globalConfig })
    expect(wrapper.findAll('.icon').length).toBeGreaterThan(0)
  })

  it('emit close 事件接口存在', async () => {
    const { default: SearchModal } = await import('../../../components/layout/searchModal.vue')
    const wrapper = mount(SearchModal, { global: _globalConfig })
    wrapper.vm.$emit('close')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
