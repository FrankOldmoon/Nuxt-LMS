/**
 * course/editor/membersManager.vue component test
 * @see modules/lms/components/course/editor/membersManager.vue
 *
 * Member management: teacher list + editor list + search add
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseMembersManager
  ;(globalThis as any).useCourseMembersManager = (_props: any) => ({
    memberSearchKeyword: ref(''),
    searchResults: ref([]),
    memberUpdating: ref(0),
    teachers: ref([]),
    editors: ref([]),
    isMemberRole: (_userId: number, _role: string) => false,
    loadMembers: vi.fn(async () => {}),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  })
})

const _globalStubs = {
  USeparator: { template: '<div class="useparator">{{ label }}</div>', props: ['label'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'icon'],
  },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label'],
  },
  MemberRow: { template: '<div class="member-row" />' },
  MemberSearchRow: { template: '<div class="member-search-row" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/editor/membersManager.vue', () => {
  it('渲染标题和分隔符', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('courseEditor.membersSection')
  })

  it('渲染教师区域标题', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('courseEditor.roleTeacher')
  })

  it('渲染编辑者区域标题', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('courseEditor.roleEditor')
  })

  it('无教师时显示空提示', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('courseEditor.noTeachers')
  })

  it('无编辑者时显示空提示', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('courseEditor.noEditors')
  })

  it('有教师时渲染教师行', async () => {
    ;(globalThis as any).useCourseMembersManager = (_props: any) => ({
      memberSearchKeyword: ref(''), searchResults: ref([]), memberUpdating: ref(0),
      teachers: ref([{ userId: 1, name: '张老师', username: 'zhang' }]),
      editors: ref([]),
      isMemberRole: () => false, loadMembers: vi.fn(async () => {}),
      addMember: vi.fn(), removeMember: vi.fn(),
    })
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.findAll('.member-row').length).toBe(1)
  })

  it('正确接收 courseId prop', async () => {
    const { default: MembersManager } = await import('../../../../components/course/editor/membersManager.vue')
    const wrapper = mount(MembersManager, {
      props: { courseId: 42 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
  })
})
