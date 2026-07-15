/**
 * class/usersTable/index.vue component test
 * @see modules/lms/components/class/usersTable/index.vue
 *
 * Class user table container: loading state + empty + tab switching + sub-tables + edit/reset modal.
 * Uses useClassUsersTable(props, { UButton }) + provideClassUsersTable(ctx).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, resolveComponent } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'
import { useClassUsersTable, provideClassUsersTable } from '../../../../composables/useClassUsersTable'

// Expose auto-imports to globalThis for the component
;(globalThis as any).resolveComponent = resolveComponent
;(globalThis as any).useClassUsersTable = useClassUsersTable
;(globalThis as any).provideClassUsersTable = provideClassUsersTable

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // stub useClassUsers（auto-import）
  ;(globalThis as any).useClassUsers = () => ({
    classUsers: ref([]),
    students: ref([]),
    teachers: ref([]),
    classUsersLoading: ref(false),
    currentClassId: ref(null),
    fetchUsers: vi.fn(),
    clearUsers: vi.fn(),
  })

  // stub useWebSocket (auto-import) — needs to return onOnlineUpdate / onRaceOnlineUpdate
  ;(globalThis as any).useWebSocket = () => ({
    ws: ref(null),
    wsConnected: ref(false),
    joinedClassId: ref(null),
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinClass: vi.fn(),
    onOnlineUpdate: vi.fn(),
    onRaceOnlineUpdate: vi.fn(),
  })
})

const _globalStubs = {
  UTable: { template: '<div class="utable" />', props: ['data', 'columns', 'ui'] },
  UTabs: { template: '<div class="utabs" />', props: ['modelValue', 'items'] },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'size', 'color', 'variant', 'label', 'aria-label'] },
  UInput: { template: '<input />', props: ['modelValue', 'size', 'placeholder'] },
  UAvatar: { template: '<span class="avatar" />', props: ['src', 'alt', 'text', 'size'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UModal: { template: '<div v-if="open" class="modal"><slot name="content" /></div>', props: ['open', 'fullscreen', 'scrollable'] },
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
  ClientOnly: { template: '<div><slot /></div>' },
  USeparator: { template: '<hr />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('class/usersTable/index.vue', () => {
  it('loading=true 时显示加载态', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: { classId: 1, loading: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('classSelector.loading')
  })

  it('rows 为空数组时显示无用户提示', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: { classId: null, rows: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('classSelector.noUsers')
  })

  it('rows 有数据时渲染表格', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: {
        classId: null,
        rows: [{ id: 1, name: 'Alice', preferName: 'Al', rollNumber: 'R001', isTeacher: false }],
      },
      global: _globalConfig,
    })
    await flushPromises()
    // When there is data, loading/noUsers is not shown
    expect(wrapper.text()).not.toContain('classSelector.noUsers')
  })

  it('正确接收 classId prop', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: { classId: 42, rows: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('classId')).toBe(42)
  })

  it('正确接收 showOnline prop', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: { classId: null, rows: [], showOnline: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('showOnline')).toBe(true)
  })

  it('expose refresh 方法', async () => {
    const { default: UsersTable } = await import('../../../../components/class/usersTable/index.vue')
    const wrapper = mount(UsersTable, {
      props: { classId: null, rows: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(typeof (wrapper.vm as any).refresh).toBe('function')
  })
})
