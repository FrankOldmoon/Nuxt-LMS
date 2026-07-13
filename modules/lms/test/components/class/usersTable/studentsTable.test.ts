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
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
  ClientOnly: { template: '<div><slot /></div>' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    showGroup: () => false,
    activeTab: ref('students'),
    sorting: ref([]),
    students: ref([]),
    columns: ref([]),
    hideNumber: () => false,
    hideActions: () => false,
    extraColumns: () => [],
    numberMap: reactive({}),
    sortableHeader: (label: string) => ({ column }: any) => label,
    onNumberBlur: vi.fn(),
    autoFillNumbers: vi.fn(),
    openEdit: vi.fn(),
    openReset: vi.fn(),
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
})
