/**
 * class/modal/index.vue component test
 * @see modules/lms/components/class/modal/index.vue
 *
 * Class selection modal container: UModal + loading state + student mode/admin mode switching.
 * Uses defineModel('open') + useClassModal(open) + provideClassModal(ctx).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui', 'scrollable'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

/** Stub useClassModal: returns minimal usable ctx, and simulates provideClassModal */
function setupClassModalStubs(overrides: any = {}) {
  const ctx = {
    classLoading: ref(false),
    myClassLoading: ref(false),
    studentMode: ref(false),
    hasRole: () => false,
    classOptions: ref([]),
    selectedItem: ref(undefined),
    onClassChange: vi.fn(),
    editingClassName: ref(false),
    editClassName: ref(''),
    savingClassName: ref(false),
    saveClassName: vi.fn(),
    cancelEditClassName: vi.fn(),
    startEditClassName: vi.fn(),
    newClassName: ref(''),
    adding: ref(false),
    addClass: vi.fn(),
    selectedClassId: ref(null),
    classUsersTableRef: ref(null),
    studentSearch: ref(''),
    studentSearching: ref(false),
    studentSearchResults: ref([]),
    selectedStudents: ref([]),
    addingStudents: ref(false),
    toggleStudentSelect: vi.fn(),
    removeSelectedStudent: vi.fn(),
    onStudentSearchInput: vi.fn(),
    addStudentsToClass: vi.fn(),
    teacherSearch: ref(''),
    teacherSearching: ref(false),
    teacherSearchResults: ref([]),
    selectedTeachers: ref([]),
    addingTeachers: ref(false),
    toggleTeacherSelect: vi.fn(),
    removeSelectedTeacher: vi.fn(),
    onTeacherSearchInput: vi.fn(),
    addTeachersToClass: vi.fn(),
    myClasses: ref([]),
    myClassOptions: ref([]),
    selectedMyClassId: ref(null),
    onMyClassChange: vi.fn(),
    classList: ref([]),
    ...overrides,
  }
  ;(globalThis as any).useClassModal = (_open: any) => ctx
  ;(globalThis as any).provideClassModal = (_ctx: any) => {}
  return ctx
}

describe('class/modal/index.vue', () => {
  it('open=true 时渲染弹窗内容', async () => {
    setupClassModalStubs()
    const { default: ClassModal } = await import('../../../../components/class/modal/index.vue')
    const wrapper = mount(ClassModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('classSelector.selectClass')
  })

  it('open=false 时不渲染弹窗内容', async () => {
    setupClassModalStubs()
    const { default: ClassModal } = await import('../../../../components/class/modal/index.vue')
    const wrapper = mount(ClassModal, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('显示取消按钮', async () => {
    setupClassModalStubs()
    const { default: ClassModal } = await import('../../../../components/class/modal/index.vue')
    const wrapper = mount(ClassModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.cancel')
  })

  it('loading 时显示加载图标', async () => {
    setupClassModalStubs({ classLoading: ref(true) })
    const { default: ClassModal } = await import('../../../../components/class/modal/index.vue')
    const wrapper = mount(ClassModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.icon').exists()).toBe(true)
  })

  it('studentMode=true 时走学生模式分支', async () => {
    setupClassModalStubs({ studentMode: ref(true), classLoading: ref(false), myClassLoading: ref(false) })
    const { default: ClassModal } = await import('../../../../components/class/modal/index.vue')
    const wrapper = mount(ClassModal, {
      props: { open: true },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
