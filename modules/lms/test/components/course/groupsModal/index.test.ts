/**
 * course/groupsModal/index.vue 组件测试
 * @see modules/lms/components/course/groupsModal/index.vue
 *
 * 分组弹窗：成员/聊天/文件 Tab
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseGroups
  ;(globalThis as any).useCourseGroups = (_props: any, _isOpen: any) => ({
    canEdit: ref(false),
    activeTab: ref('members'),
    tabs: ref([
      { label: 'members', value: 'members' },
      { label: 'chat', value: 'chat' },
      { label: 'files', value: 'files' },
    ]),
    loading: ref(false),
    saving: ref(false),
    selectedGroupName: ref(''),
    groupOptions: ref([]),
    activeGroupId: ref(''),
    addGroup: vi.fn(),
    saveGroups: vi.fn(async () => {}),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'loading', 'disabled'],
  },
  USelect: {
    template: '<select class="uselect"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
  CourseGroupsModalMembersTab: { template: '<div class="members-tab" />' },
  CourseGroupChat: { template: '<div class="group-chat" />', props: ['groupId'] },
  FilesMyFilesModal: { template: '<div class="files-modal" />', props: ['group', 'inline'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/groupsModal/index.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: false, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.groups')
  })

  it('渲染 Tab 列表', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('members')
    expect(wrapper.text()).toContain('chat')
    expect(wrapper.text()).toContain('files')
  })

  it('activeTab=members 时渲染成员 Tab', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.members-tab').exists()).toBe(true)
  })

  it('canEdit=true 且 activeTab=members 时渲染添加和保存按钮', async () => {
    ;(globalThis as any).useCourseGroups = (_props: any, _isOpen: any) => ({
      canEdit: ref(true), activeTab: ref('members'),
      tabs: ref([{ label: 'members', value: 'members' }]),
      loading: ref(false), saving: ref(false),
      selectedGroupName: ref(''), groupOptions: ref([]), activeGroupId: ref(''),
      addGroup: vi.fn(), saveGroups: vi.fn(async () => {}),
    })
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('正确接收 courseId 和 classId props', async () => {
    const { default: GroupsModal } = await import('../../../../components/course/groupsModal/index.vue')
    const wrapper = mount(GroupsModal, {
      props: { open: true, courseId: 42, classId: 7 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
    expect(wrapper.props('classId')).toBe(7)
  })
})
