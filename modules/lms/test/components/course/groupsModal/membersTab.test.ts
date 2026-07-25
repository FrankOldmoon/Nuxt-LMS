/**
 * course/groupsModal/membersTab.vue 组件测试
 * @see modules/lms/components/course/groupsModal/membersTab.vue
 *
 * 分组成员 Tab：学生视角只读 + 教师视角拖拽编辑
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
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size'],
  },
  AuthUserCard: { template: '<div class="auth-user-card" />', props: ['user'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const ctx = {
    canEdit: ref(false),
    ungrouped: ref([]),
    groupData: ref({} as Record<string, any[]>),
    groupNames: ref({} as Record<string, string>),
    dropTarget: ref<string | null>(null),
    myGroupName: ref(''),
    myGroupMembers: ref([] as any[]),
    getStudentObj: (s: any) => ({ id: s.userId, name: s.name, avatarImg: s.avatarImg }),
    onDragStart: vi.fn(),
    onGroupDragOver: vi.fn(),
    onDrop: vi.fn(),
    onInnerDrop: vi.fn(),
    removeGroup: vi.fn(),
    onRename: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useCourseGroupsContext = () => ctx
  return ctx
}

describe('course/groupsModal/membersTab.vue', () => {
  it('学生视角 canEdit=false 时渲染只读视图', async () => {
    setupContext({ canEdit: ref(false), myGroupMembers: ref([]) })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.ungrouped')
  })

  it('学生有组时渲染组员列表', async () => {
    setupContext({
      canEdit: ref(false),
      myGroupName: ref('Group A'),
      myGroupMembers: ref([
        { userId: 1, name: 'Alice', avatarImg: null, _isLeader: true },
        { userId: 2, name: 'Bob', avatarImg: null },
      ]),
    })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('Group A')
    expect(wrapper.findAll('.auth-user-card').length).toBe(2)
  })

  it('组长显示组长 badge', async () => {
    setupContext({
      canEdit: ref(false),
      myGroupName: ref('G1'),
      myGroupMembers: ref([{ userId: 1, name: 'Alice', avatarImg: null, _isLeader: true }]),
    })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ubadge').exists()).toBe(true)
  })

  it('教师视角 canEdit=true 时渲染编辑视图', async () => {
    setupContext({
      canEdit: ref(true),
      ungrouped: ref([{ userId: 1, name: 'A', avatarImg: null }]),
      groupData: ref({ g1: [{ userId: 2, name: 'B', avatarImg: null }] }),
      groupNames: ref({ g1: 'g1' }),
    })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    // 教师视图有未分组区域
    expect(wrapper.text()).toContain('coursePanel.ungrouped')
    // 渲染未分组学生卡片
    expect(wrapper.findAll('.auth-user-card').length).toBeGreaterThanOrEqual(1)
  })

  it('教师视角渲染分组列表', async () => {
    setupContext({
      canEdit: ref(true),
      ungrouped: ref([]),
      groupData: ref({
        groupA: [{ userId: 1, name: 'Alice', avatarImg: null }],
        groupB: [{ userId: 2, name: 'Bob', avatarImg: null }],
      }),
      groupNames: ref({ groupA: 'groupA', groupB: 'groupB' }),
    })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    // 分组名渲染在原生 <input v-model="groupNames[key]"> 中，wrapper.text() 不含 input 值
    const inputs = wrapper.findAll('input')
    const values = inputs.map(i => (i.element as HTMLInputElement).value)
    expect(values).toContain('groupA')
    expect(values).toContain('groupB')
  })

  it('教师视角渲染删除分组按钮', async () => {
    setupContext({
      canEdit: ref(true),
      ungrouped: ref([]),
      groupData: ref({ g1: [{ userId: 1, name: 'A', avatarImg: null }] }),
      groupNames: ref({ g1: 'g1' }),
    })
    const { default: MembersTab } = await import('../../../../components/course/groupsModal/membersTab.vue')
    const wrapper = mount(MembersTab, { global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.ubutton').exists()).toBe(true)
  })
})
