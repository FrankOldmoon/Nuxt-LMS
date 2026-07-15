/**
 * class/modal/adminMode.vue component test
 * @see modules/lms/components/class/modal/adminMode.vue
 *
 * Admin mode class selection: class dropdown + add class + user table + member search.
 * Depends on useClassModalContext() (inject), stubbed to globalThis in tests.
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
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup\')" />',
    props: ['modelValue', 'placeholder', 'icon', 'size'],
  },
  UInputMenu: {
    template: '<select :value="modelValue" @change="$emit(\'change\', $event)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'labelKey', 'placeholder', 'loading', 'icon'],
  },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'size', 'color', 'variant', 'loading', 'aria-label'],
  },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

/** Stub useClassModalContext, returns controllable mock data */
function setupMockContext(overrides: any = {}) {
  const ctx = {
    hasRole: (code: string) => code === 'admin',
    classOptions: ref([{ label: 'Class A', value: 1 }]),
    selectedItem: ref<number | undefined>(undefined),
    classLoading: ref(false),
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
    selectedClassId: ref<number | null>(1),
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
    ...overrides,
  }
  ;(globalThis as any).useClassModalContext = () => ctx
  return ctx
}

describe('class/modal/adminMode.vue', () => {
  it('渲染班级选择区域', async () => {
    setupMockContext()
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    // Has select (UInputMenu stub) and buttons
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('admin 角色显示新增班级输入框', async () => {
    setupMockContext({ hasRole: () => true })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.text()).toContain('classSelector.addClass')
  })

  it('非 admin 角色不显示新增班级区域', async () => {
    setupMockContext({ hasRole: () => false })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('classSelector.addClass')
  })

  it('selectedClassId 存在时显示成员搜索区域', async () => {
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.text()).toContain('classSelector.addMembers')
  })

  it('selectedClassId 为 null 时不显示成员搜索区域', async () => {
    setupMockContext({ selectedClassId: ref(null) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('classSelector.addMembers')
  })
})
