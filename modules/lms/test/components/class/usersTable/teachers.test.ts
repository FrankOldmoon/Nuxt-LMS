/**
 * class/usersTable/teachers.vue component test
 * @see modules/lms/components/class/usersTable/teachers.vue
 *
 * Teacher list: avatar + name + edit button.
 * Depends on useClassUsersTableContext() (inject), stubbed to globalThis in tests.
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
  UAvatar: { template: '<span class="avatar">{{ alt || text }}</span>', props: ['src', 'alt', 'text', 'size'] },
  UButton: { template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'size', 'color', 'variant', 'aria-label'] },
  USeparator: { template: '<hr class="separator" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    teachers: ref([]),
    students: ref([]),
    hideTeachers: () => false,
    openEdit: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  return ctx
}

describe('class/usersTable/teachers.vue', () => {
  it('hideTeachers=false 且有教师时渲染列表', async () => {
    setupMockContext({
      teachers: ref([{ id: 1, name: 'Teacher A', avatarImg: null }]),
    })
    const { default: Teachers } = await import('../../../../components/class/usersTable/teachers.vue')
    const wrapper = mount(Teachers, { global: _globalConfig })
    expect(wrapper.text()).toContain('Teacher A')
    expect(wrapper.text()).toContain('classSelector.teachers')
  })

  it('hideTeachers=true 时不渲染', async () => {
    setupMockContext({ hideTeachers: () => true, teachers: ref([{ id: 1, name: 'T' }]) })
    const { default: Teachers } = await import('../../../../components/class/usersTable/teachers.vue')
    const wrapper = mount(Teachers, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('classSelector.teachers')
  })

  it('教师为空时不渲染', async () => {
    setupMockContext({ teachers: ref([]) })
    const { default: Teachers } = await import('../../../../components/class/usersTable/teachers.vue')
    const wrapper = mount(Teachers, { global: _globalConfig })
    expect(wrapper.text()).not.toContain('classSelector.teachers')
  })

  it('有学生时显示分隔线', async () => {
    setupMockContext({
      teachers: ref([{ id: 1, name: 'Teacher A', avatarImg: null }]),
      students: ref([{ id: 2, name: 'Student A' }]),
    })
    const { default: Teachers } = await import('../../../../components/class/usersTable/teachers.vue')
    const wrapper = mount(Teachers, { global: _globalConfig })
    expect(wrapper.find('.separator').exists()).toBe(true)
  })

  it('点击编辑按钮调用 openEdit', async () => {
    const openEdit = vi.fn()
    setupMockContext({
      teachers: ref([{ id: 5, name: 'Teacher A', avatarImg: null }]),
      openEdit,
    })
    const { default: Teachers } = await import('../../../../components/class/usersTable/teachers.vue')
    const wrapper = mount(Teachers, { global: _globalConfig })
    const btn = wrapper.find('button')
    await btn.trigger('click')
    expect(openEdit).toHaveBeenCalledWith(5)
  })
})
