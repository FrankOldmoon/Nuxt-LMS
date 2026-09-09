/**
 * class/usersTable/studentStatsModal.vue 组件测试
 * @see modules/lms/components/class/usersTable/studentStatsModal.vue
 *
 * 学生学习数据弹窗：标题展示学生信息 + 复用 studentStats.vue 渲染学习统计与雷达图。
 * 依赖 useStudentGradesContext()（inject）与 useGradesContext()（inject），
 * 内部 CourseGradesModalStudentStats 仅消费 statCards / radarOption。
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
  UModal: { template: '<div v-if="open" class="umodal"><slot name="content" /><slot /></div>', props: ['open', 'ui'] },
  UAvatar: { template: '<span class="avatar">{{ alt || text }}</span>', props: ['src', 'alt', 'text', 'size'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  // 把 studentStats 内容也 stub 出来，避免依赖其内部的 useGradesContext
  CourseGradesModalStudentStats: { template: '<div class="student-stats-stub" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupComposables(overrides: any = {}) {
  const studentCtx = {
    pending: ref(false),
    stats: ref({ questionCount: 0, homeworkCount: 0, quizCount: 0, raceCount: 0, commentCount: 0 }),
    score: ref({
      questionScore: 0, homeworkScore: 0, quizScore: 0,
      commentScore: 0, altitudeScore: 0, externalScore: 0,
    }),
    statCards: ref([
      { label: 'Q', value: 1 },
      { label: 'H', value: 2 },
    ]),
    radarOption: ref({ title: { text: 'radar' } }),
    loadData: vi.fn(async () => {}),
    ...overrides,
  }
  ;(globalThis as any).useStudentGrades = () => studentCtx
  ;(globalThis as any).provideStudentGrades = vi.fn()
  // gradesModal 兼容：provideGrades 供 studentStats.vue 内部 useGradesContext 使用
  ;(globalThis as any).provideGrades = vi.fn()
  return studentCtx
}

describe('class/usersTable/studentStatsModal.vue', () => {
  it('open=false 时不渲染弹窗内容', async () => {
    setupComposables()
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: { open: false, userId: 1, classId: 2 },
      global: _globalConfig,
    })
    expect(wrapper.find('.umodal').exists()).toBe(false)
  })

  it('open=true 时渲染弹窗内容', async () => {
    setupComposables()
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: { open: true, userId: 1, classId: 2 },
      global: _globalConfig,
    })
    expect(wrapper.find('.umodal').exists()).toBe(true)
  })

  it('显示学生姓名（user.name）', async () => {
    setupComposables()
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: {
        open: true,
        userId: 1,
        classId: 2,
        user: { id: 1, name: 'Alice', preferName: 'Al', avatarImg: null },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Al')
  })

  it('user 不存在时使用 i18n 标题', async () => {
    setupComposables()
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: { open: true, userId: 1, classId: 2, user: undefined },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('classSelector.studentStatsTitle')
  })

  it('渲染 studentStats 子组件', async () => {
    setupComposables()
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: { open: true, userId: 1, classId: 2 },
      global: _globalConfig,
    })
    expect(wrapper.find('.student-stats-stub').exists()).toBe(true)
  })

  it('pending=true 时显示加载图标', async () => {
    setupComposables({ pending: ref(true) })
    const { default: StudentStatsModal } = await import('../../../../components/class/usersTable/studentStatsModal.vue')
    const wrapper = mount(StudentStatsModal, {
      props: { open: true, userId: 1, classId: 2 },
      global: _globalConfig,
    })
    // UIcon stub 存在即视为加载图标存在
    expect(wrapper.find('.uicon').exists()).toBe(true)
  })
})
