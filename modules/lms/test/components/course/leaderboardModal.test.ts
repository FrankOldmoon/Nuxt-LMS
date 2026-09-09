/**
 * course/leaderboardModal.vue 组件测试
 * @see modules/lms/components/course/leaderboardModal.vue
 *
 * 排行榜弹窗：我的排名 + 表格
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseLeaderboard
  ;(globalThis as any).useCourseLeaderboard = (_props: any, _isOpen: any) => ({
    loading: ref(false),
    myStudent: ref(null),
    myRank: ref(null),
    tableRows: ref([]),
    extraColumns: ref([]),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UAvatar: {
    template: '<span class="uavatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  UButton: { template: '<button class="ubtn" @click="$emit(\'click\')"><slot /></button>', props: ['icon', 'label', 'color', 'variant', 'size'] },
  CourseClassAvgLeaderboardModal: {
    template: '<div class="class-avg-modal" />',
    props: ['open', 'courseId'],
  },
  ClassUsersTable: {
    template: '<div class="class-users-table"><slot /></div>',
    props: ['rows', 'classId', 'courseId', 'hideActions', 'hideTeachers', 'hideNumber', 'defaultSort', 'showChart', 'showGroup', 'extraColumns'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/leaderboardModal.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: false, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.leaderboard')
  })

  it('myRank 存在时渲染我的排名', async () => {
    ;(globalThis as any).useCourseLeaderboard = (_props: any, _isOpen: any) => ({
      loading: ref(false),
      myStudent: ref({ id: 1, name: 'Me', avatarImg: null }),
      myRank: ref({ userId: 1, rank: 3, score: 85.5 }),
      tableRows: ref([]),
      extraColumns: ref([]),
    })
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('85.5')
    expect(wrapper.text()).toContain('Me')
  })

  it('loading=true 时显示加载中', async () => {
    ;(globalThis as any).useCourseLeaderboard = (_props: any, _isOpen: any) => ({
      loading: ref(true), myStudent: ref(null), myRank: ref(null),
      tableRows: ref([]), extraColumns: ref([]),
    })
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('common.loading')
  })

  it('正确接收 courseId 和 classId props', async () => {
    const { default: LeaderboardModal } = await import('../../../components/course/leaderboardModal.vue')
    const wrapper = mount(LeaderboardModal, {
      props: { open: true, courseId: 42, classId: 7 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
    expect(wrapper.props('classId')).toBe(7)
  })
})
