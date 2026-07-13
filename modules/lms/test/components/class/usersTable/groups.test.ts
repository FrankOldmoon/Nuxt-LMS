/**
 * class/usersTable/groups.vue 组件测试
 * @see modules/lms/components/class/usersTable/groups.vue
 *
 * 小组模式表格 + 小组得分柱状图。
 * 依赖 useClassUsersTableContext()（inject），测试中 stub 到 globalThis。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _mockRow = { original: { groupName: 'Group A', leader: null, memberCount: 3, avgScore: 80 } }

const _globalStubs = {
  UTable: {
    template: '<div class="utable"><slot name="groupName-cell" :row="row" /><slot name="leader-cell" :row="row" /><slot name="memberCount-cell" :row="row" /><slot name="avgScore-cell" :row="row" /></div>',
    props: ['data', 'columns', 'ui'],
    data() { return { row: _mockRow } },
  },
  UAvatar: { template: '<span class="avatar">{{ alt || text }}</span>', props: ['src', 'alt', 'text', 'size'] },
  UBadge: { template: '<span class="badge"><slot /></span>', props: ['color', 'variant', 'size'] },
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
  ClientOnly: { template: '<div><slot /></div>' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    showGroup: () => true,
    showChart: () => false,
    activeTab: ref('groups'),
    groupTableRows: ref([]),
    groupColumns: ref([]),
    groupSorting: ref([]),
    groupChartOption: ref({}),
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  return ctx
}

describe('class/usersTable/groups.vue', () => {
  it('showGroup=true 且 activeTab=groups 时渲染', async () => {
    setupMockContext({ groupTableRows: ref([{ groupName: 'A', memberCount: 3, avgScore: 80 }]) })
    const { default: Groups } = await import('../../../../components/class/usersTable/groups.vue')
    const wrapper = mount(Groups, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(true)
  })

  it('showGroup=false 时不渲染', async () => {
    setupMockContext({ showGroup: () => false })
    const { default: Groups } = await import('../../../../components/class/usersTable/groups.vue')
    const wrapper = mount(Groups, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(false)
  })

  it('activeTab=students 时不渲染', async () => {
    setupMockContext({ activeTab: ref('students') })
    const { default: Groups } = await import('../../../../components/class/usersTable/groups.vue')
    const wrapper = mount(Groups, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(false)
  })

  it('groupTableRows 为空时不渲染表格', async () => {
    setupMockContext({ groupTableRows: ref([]) })
    const { default: Groups } = await import('../../../../components/class/usersTable/groups.vue')
    const wrapper = mount(Groups, { global: _globalConfig })
    expect(wrapper.find('.utable').exists()).toBe(false)
  })

  it('showChart=true 且有数据时渲染图表', async () => {
    setupMockContext({
      showChart: () => true,
      groupTableRows: ref([{ groupName: 'A', memberCount: 3, avgScore: 80 }]),
    })
    const { default: Groups } = await import('../../../../components/class/usersTable/groups.vue')
    const wrapper = mount(Groups, { global: _globalConfig })
    expect(wrapper.find('.chart').exists()).toBe(true)
  })
})
