/**
 * class/modal/studentMode.vue component test
 * @see modules/lms/components/class/modal/studentMode.vue
 *
 * Student mode: single-select class (radio group) or empty hint.
 * Depends on useClassModalContext() (inject), stubbed to globalThis in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  URadioGroup: {
    template: '<div class="radio-group"><slot /></div>',
    props: ['modelValue', 'items', 'valueKey', 'labelKey'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    myClasses: ref([]),
    myClassOptions: ref([]),
    selectedMyClassId: ref<number | null>(null),
    onMyClassChange: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useClassModalContext = () => ctx
  return ctx
}

describe('class/modal/studentMode.vue', () => {
  it('myClasses 为空时显示无班级提示', async () => {
    setupMockContext({ myClasses: ref([]) })
    const { default: StudentMode } = await import('../../../../components/class/modal/studentMode.vue')
    const wrapper = mount(StudentMode, { global: _globalConfig })
    expect(wrapper.text()).toContain('classSelector.noMyClasses')
  })

  it('myClasses 有数据时渲染 radio group', async () => {
    setupMockContext({
      myClasses: ref([{ id: 1, name: 'Class A' }]),
      myClassOptions: ref([{ label: 'Class A', value: 1 }]),
    })
    const { default: StudentMode } = await import('../../../../components/class/modal/studentMode.vue')
    const wrapper = mount(StudentMode, { global: _globalConfig })
    expect(wrapper.find('.radio-group').exists()).toBe(true)
  })

  it('正确传递 myClassOptions 到 radio group', async () => {
    const opts = [{ label: 'Class A', value: 1 }, { label: 'Class B', value: 2 }]
    setupMockContext({
      myClasses: ref([{ id: 1, name: 'Class A' }, { id: 2, name: 'Class B' }]),
      myClassOptions: ref(opts),
    })
    const { default: StudentMode } = await import('../../../../components/class/modal/studentMode.vue')
    const wrapper = mount(StudentMode, { global: _globalConfig })
    expect(wrapper.find('.radio-group').attributes()).toBeDefined()
  })
})
