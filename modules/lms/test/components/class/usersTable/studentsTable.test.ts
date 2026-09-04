/**
 * class/usersTable/studentsTable.vue 组件测试
 * @see modules/lms/components/class/usersTable/studentsTable.vue
 *
 * 学生表格 + 导出按钮 + 编号管理 + 重置密码列。
 * 依赖 useClassUsersTableContext()（inject），测试中 stub 到 globalThis。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UTable: { template: '<div class="utable"><slot /></div>', props: ['data', 'columns', 'ui'] },
  UButton: { template: '<button @click="$emit(\'click\')" :disabled="disabled">{{ label }}<slot /></button>', props: ['icon', 'size', 'color', 'variant', 'label', 'aria-label'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'size', 'placeholder'] },
  UAvatar: { template: '<span class="avatar">{{ alt || text }}</span>', props: ['src', 'alt', 'text', 'size'] },
  UModal: { template: '<div v-if="open" class="umodal"><slot /></div>', props: ['open', 'ui'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
  ClientOnly: { template: '<div><slot /></div>' },
  ClassUsersTableTeachers: { template: '<div class="teachers-stub" />' },
  ClassUsersTableChart: { template: '<div class="chart-stub" />' },
  ClassUsersTableExportSheet: { template: '<div class="export-sheet-stub" />' },
  ClassUsersTableStudentStatsModal: { template: '<div v-if="open" class="stats-modal-stub" />', props: ['open', 'userId', 'classId', 'user'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    showGroup: () => false,
    showChart: () => false,
    showMedal: () => false,
    activeTab: ref('students'),
    sorting: ref([]),
    students: ref([]),
    columns: ref([]),
    hideNumber: () => false,
    hideActions: () => false,
    extraColumns: () => [],
    classId: () => 0,
    numberMap: reactive({}),
    sortableHeader: (label: string) => ({ column }: any) => label,
    onNumberBlur: vi.fn(),
    autoFillNumbers: vi.fn(),
    openEdit: vi.fn(),
    openReset: vi.fn(),
    openStats: vi.fn(),
    statsOpen: ref(false),
    statsUserId: ref<number | null>(null),
    statsUser: ref<any | null>(null),
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  return ctx
}

describe('class/usersTable/studentsTable.vue', () => {
  it('有学生时渲染表格', async () => {
    setupMockContext({
      students: ref([{ id: 1, name: 'Alice', preferName: 'Al', rollNumber: 'R001', avatarImg: null }]),
    })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(true)
  })

  it('学生为空时不渲染表格', async () => {
    setupMockContext({ students: ref([]) })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(false)
  })

  it('有学生时显示导出按钮', async () => {
    setupMockContext({
      students: ref([{ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null }]),
    })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    expect(wrapper.text()).toContain('classSelector.export')
  })

  it('showGroup=true 且 activeTab=students 时仍渲染（v-show）', async () => {
    setupMockContext({
      showGroup: () => true,
      activeTab: ref('students'),
      students: ref([{ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null }]),
    })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    // v-show 不移除 DOM，只隐藏
    expect(wrapper.find('.utable').exists()).toBe(true)
  })

  it('点击学生姓名时调用 openStats 并弹出 stats 弹窗', async () => {
    const openStats = vi.fn()
    const student = { id: 42, name: 'Alice', preferName: 'Al', rollNumber: 'R001', avatarImg: null }
    setupMockContext({
      students: ref([student]),
      openStats,
    })
    // 简化 UTable stub：直接渲染 name-cell 插槽
    const richStubs = {
      ..._globalStubs,
      UTable: {
        props: ['data', 'columns', 'ui'],
        template: `<div class="utable">
          <div v-for="row in data" :key="row.id" class="row">
            <slot name="name-cell" :row="{ original: row }" />
          </div>
        </div>`,
      },
    }
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: { mocks: _globalConfig.mocks, stubs: richStubs } })
    const nameButton = wrapper.find('button[title="classSelector.viewStudentStats"]')
    expect(nameButton.exists()).toBe(true)
    await nameButton.trigger('click')
    expect(openStats).toHaveBeenCalledWith(student)
  })

  it('statsOpen=false 时弹窗不渲染内容（占位 stub 不出现）', async () => {
    setupMockContext({
      students: ref([{ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null }]),
      statsOpen: ref(false),
    })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    expect(wrapper.find('.stats-modal-stub').exists()).toBe(false)
  })

  it('statsOpen=true 时弹窗渲染', async () => {
    setupMockContext({
      students: ref([{ id: 1, name: 'Alice', preferName: '', rollNumber: '', avatarImg: null }]),
      statsOpen: ref(true),
      statsUserId: ref(1),
      statsUser: ref({ id: 1, name: 'Alice' }),
    })
    const { default: StudentsTable } = await import('../../../../components/class/usersTable/studentsTable.vue')
    const wrapper = mount(StudentsTable, { global: _globalConfig })
    expect(wrapper.find('.stats-modal-stub').exists()).toBe(true)
  })
})
