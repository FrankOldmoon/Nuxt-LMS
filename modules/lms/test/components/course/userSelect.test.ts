/**
 * course/userSelect.vue component test
 * @see modules/lms/components/course/userSelect.vue
 *
 * User selector: select student identity to switch view (teacher feature)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseUserSelect
  ;(globalThis as any).useCourseUserSelect = (_props: any, _emit: any) => ({
    loading: ref(false),
    restoring: ref(false),
    selectedUserId: ref(0),
    impersonating: ref(false),
    userOptions: ref([]),
    onSelect: vi.fn(),
    restore: vi.fn(),
  })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  USelect: {
    template: '<select class="uselect"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'loading', 'size', 'placeholder'],
  },
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'size', 'variant', 'color', 'loading', 'label'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/userSelect.vue', () => {
  it('渲染选择器标题', async () => {
    const { default: UserSelect } = await import('../../../components/course/userSelect.vue')
    const wrapper = mount(UserSelect, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('coursePanel.viewAs')
  })

  it('渲染 USelect', async () => {
    const { default: UserSelect } = await import('../../../components/course/userSelect.vue')
    const wrapper = mount(UserSelect, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.uselect').exists()).toBe(true)
  })

  it('impersonating=false 时不显示还原按钮和徽标', async () => {
    const { default: UserSelect } = await import('../../../components/course/userSelect.vue')
    const wrapper = mount(UserSelect, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.ubadge').exists()).toBe(false)
  })

  it('impersonating=true 时显示还原按钮和徽标', async () => {
    ;(globalThis as any).useCourseUserSelect = (_props: any, _emit: any) => ({
      loading: ref(false),
      restoring: ref(false),
      selectedUserId: ref(5),
      impersonating: ref(true),
      userOptions: ref([{ label: 'Student A', value: 5 }]),
      onSelect: vi.fn(),
      restore: vi.fn(),
    })
    const { default: UserSelect } = await import('../../../components/course/userSelect.vue')
    const wrapper = mount(UserSelect, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.ubadge').exists()).toBe(true)
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })

  it('正确接收 courseId prop', async () => {
    const { default: UserSelect } = await import('../../../components/course/userSelect.vue')
    const wrapper = mount(UserSelect, {
      props: { courseId: 42 },
      global: _globalConfig,
    })
    expect(wrapper.props('courseId')).toBe(42)
  })
})
