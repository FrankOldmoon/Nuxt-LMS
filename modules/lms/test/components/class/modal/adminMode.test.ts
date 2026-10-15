/**
 * class/modal/adminMode.vue 组件测试
 * @see modules/lms/components/class/modal/adminMode.vue
 *
 * 管理模式班级选择：班级下拉 + 新增班级 + 用户表格 + 成员搜索。
 * 依赖 useClassModalContext()（inject），测试中 stub 到 globalThis。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(0)
  _authLmsState.roles = []
  _authLmsState.editorCourseIds = []
})

/** useAuthLms 桩的可控状态（hasRole / 学号编辑权限测试用） */
const _authLmsState = {
  roles: [] as string[],
  editorCourseIds: [] as number[],
}
;(globalThis as any).useAuthLms = () => ({
  hasRole: (code: string) => _authLmsState.roles.includes(code),
  isCourseEditor: (courseId: number) => _authLmsState.editorCourseIds.includes(courseId),
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
  // 模板实际用 USelectMenu（区别于旧 stub 名 UInputMenu）
  USelectMenu: {
    template: '<select :value="modelValue" @change="$emit(\'change\', $event)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'labelKey', 'optionAttribute', 'placeholder', 'loading', 'icon'],
  },
  UButton: {
    template: '<button :disabled="loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'size', 'color', 'variant', 'loading'],
  },
  UIcon: { template: '<span />', props: ['name'] },
  ClassUsersTable: {
    name: 'ClassUsersTable',
    template: '<div class="class-users-table" />',
    props: ['classId', 'courseId', 'rows', 'showOnline', 'editableNumber'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

/** Stub useClassModalContext，返回可控的 mock 数据 */
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
    // 有 select（UInputMenu stub）和按钮
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('admin 角色显示新增班级输入框', async () => {
    _authLmsState.roles = ['admin']
    setupMockContext()
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.text()).toContain('classSelector.addClass')
  })

  it('非 admin 角色不显示新增班级区域', async () => {
    _authLmsState.roles = ['teacher']
    setupMockContext()
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

  // ====================== 编辑班级名称按钮（仅管理员可见） ======================

  it('admin 角色显示编辑班级名称按钮', async () => {
    _authLmsState.roles = ['admin']
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.find('button[aria-label="classSelector.editClassName"]').exists()).toBe(true)
  })

  it('非 admin 角色（teacher）不显示编辑班级名称按钮', async () => {
    _authLmsState.roles = ['teacher']
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.find('button[aria-label="classSelector.editClassName"]').exists()).toBe(false)
  })

  // ====================== 学号编辑权限（editableNumber） ======================

  it('课程编辑者（courseEditor）number 列可编辑', async () => {
    setMockLmsContext(10)
    _authLmsState.roles = []
    _authLmsState.editorCourseIds = [10]
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.findComponent({ name: 'ClassUsersTable' }).props('editableNumber')).toBe(true)
  })

  it('课程教师（非编辑者）number 列只读', async () => {
    setMockLmsContext(10)
    _authLmsState.roles = ['teacher']
    _authLmsState.editorCourseIds = []
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.findComponent({ name: 'ClassUsersTable' }).props('editableNumber')).toBe(false)
  })

  it('管理员 number 列可编辑', async () => {
    setMockLmsContext(10)
    _authLmsState.roles = ['admin']
    _authLmsState.editorCourseIds = []
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.findComponent({ name: 'ClassUsersTable' }).props('editableNumber')).toBe(true)
  })

  it('无课程上下文（courseId=0）时 number 列只读', async () => {
    setMockLmsContext(0)
    _authLmsState.roles = ['admin']
    _authLmsState.editorCourseIds = []
    setupMockContext({ selectedClassId: ref(1) })
    const { default: AdminMode } = await import('../../../../components/class/modal/adminMode.vue')
    const wrapper = mount(AdminMode, { global: _globalConfig })
    expect(wrapper.findComponent({ name: 'ClassUsersTable' }).props('editableNumber')).toBe(false)
  })
})
