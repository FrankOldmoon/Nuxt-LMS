/**
 * course/btns.vue component test
 * @see modules/lms/components/course/btns.vue
 *
 * Course panel button group: shows different function buttons based on courseBtnsConfig
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useLayoutState returns configurable courseBtnsConfig
  const courseBtnsConfig = reactive({
    showProgress: true,
    showLeaderboard: true,
    showGroups: true,
    showGrades: true,
    showAnnouncements: true,
    showWrongBook: true,
  })
  ;(globalThis as any).useLayoutState = () => ({ courseBtnsConfig })
})

const _globalStubs = {
  UTooltip: {
    template: '<span class="utooltip"><slot /></span>',
    props: ['text'],
  },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'size'],
  },
  // stub course modal components (by auto-import component name)
  CourseProgressModal: { template: '<div class="course-progress-modal" />' },
  CourseLeaderboardModal: { template: '<div class="course-leaderboard-modal" />' },
  CourseGroupsModal: { template: '<div class="course-groups-modal" />' },
  CourseGradesModal: { template: '<div class="course-grades-modal" />' },
  CourseAnnouncementsModal: { template: '<div class="course-announcements-modal" />' },
  CourseWrongBookModal: { template: '<div class="course-wrong-book-modal" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/btns.vue', () => {
  it('未登录时不渲染按钮组', async () => {
    // Does not call setMockAuthUser → user is null
    const { default: Btns } = await import('../../../components/course/btns.vue')
    const wrapper = mount(Btns, {
      props: { courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    expect(wrapper.find('.ubutton').exists()).toBe(false)
  })

  it('已登录时渲染按钮组', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    const { default: Btns } = await import('../../../components/course/btns.vue')
    const wrapper = mount(Btns, {
      props: { courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    // All buttons on → at least 6 buttons
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBeGreaterThanOrEqual(6)
  })

  it('showProgress=false 时不渲染进度按钮', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    ;(globalThis as any).useLayoutState = () => ({
      courseBtnsConfig: reactive({
        showProgress: false,
        showLeaderboard: true,
        showGroups: true,
        showGrades: true,
        showAnnouncements: true,
        showWrongBook: true,
      }),
    })
    const { default: Btns } = await import('../../../components/course/btns.vue')
    const wrapper = mount(Btns, {
      props: { courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    // 5 buttons (excluding progress)
    const buttons = wrapper.findAll('.ubutton')
    expect(buttons.length).toBe(5)
  })

  it('正确接收 courseId 和 navigation props', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    const { default: Btns } = await import('../../../components/course/btns.vue')
    const wrapper = mount(Btns, {
      props: { courseId: '42', navigation: [{ label: 'ch1', to: '/c/1' }] },
      global: _globalConfig,
    })
    expect(wrapper.props('courseId')).toBe('42')
    expect(wrapper.props('navigation')).toEqual([{ label: 'ch1', to: '/c/1' }])
  })

  it('渲染所有弹窗组件', async () => {
    setMockAuthUser({ id: 1, name: 'student' }, [{ code: 'student' }], [])
    const { default: Btns } = await import('../../../components/course/btns.vue')
    const wrapper = mount(Btns, {
      props: { courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    expect(wrapper.find('.course-progress-modal').exists()).toBe(true)
    expect(wrapper.find('.course-leaderboard-modal').exists()).toBe(true)
    expect(wrapper.find('.course-groups-modal').exists()).toBe(true)
    expect(wrapper.find('.course-grades-modal').exists()).toBe(true)
    expect(wrapper.find('.course-announcements-modal').exists()).toBe(true)
    expect(wrapper.find('.course-wrong-book-modal').exists()).toBe(true)
  })
})
