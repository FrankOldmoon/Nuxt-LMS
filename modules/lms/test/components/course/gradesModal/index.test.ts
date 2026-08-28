/**
 * course/gradesModal/index.vue 组件测试
 * @see modules/lms/components/course/gradesModal/index.vue
 *
 * 成绩弹窗：UModal 容器，内部 useCourseGrades 提供上下文
 * 重点测试：能否挂载、能否接收 props
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseGrades + provideGrades
  const ctx = {
    rows: ref([]),
    pending: ref(false),
    extraColumns: ref([]),
    defaultSort: ref([]),
    canEdit: ref(false),
    computeGrade: () => ({ letter: '-', finalScore: 0 }),
    saveExternalScore: vi.fn(async () => {}),
    externalScoreSaving: ref(0),
    // 评分标准上下文（criteria/studentCriteria/studentStats 用）
    gradeCriteria: ref({ weights: [], levels: [] }),
    effectiveCriteria: ref({ weights: [], levels: [] }),
    criteriaDirty: ref(false),
    saveCriteria: vi.fn(async () => {}),
    resetCriteria: vi.fn(),
    statCards: ref([]),
    radarOption: ref({}),
  }
  ;(globalThis as any).useCourseGrades = () => ctx
  ;(globalThis as any).provideGrades = () => {}
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'size', 'loading'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  // stub 子组件
  CourseGradesModalCriteria: { template: '<div class="criteria" />' },
  CourseGradesModalStudentCriteria: { template: '<div class="student-criteria" />' },
  CourseGradesModalStudentStats: { template: '<div class="student-stats" />' },
  ClassUsersTable: {
    template: '<div class="class-users-table"><slot /></div>',
    props: ['rows', 'loading', 'extraColumns', 'hideActions', 'hideTeachers', 'hideNumber', 'defaultSort'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/gradesModal/index.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: false, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.grades')
  })

  it('canEdit=false 时渲染学生视图', async () => {
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    // canEdit=false → 渲染 StudentCriteria（而非教师 Criteria）+ StudentStats
    expect(wrapper.find('.student-criteria').exists()).toBe(true)
    expect(wrapper.find('.student-stats').exists()).toBe(true)
    expect(wrapper.find('.criteria').exists()).toBe(false)
  })

  it('canEdit=true 时渲染教师视图', async () => {
    ;(globalThis as any).useCourseGrades = () => ({
      rows: ref([]), pending: ref(false), extraColumns: ref([]), defaultSort: ref([]),
      canEdit: ref(true), computeGrade: () => ({ letter: '-', finalScore: 0 }),
      saveExternalScore: vi.fn(async () => {}), externalScoreSaving: ref(0),
      gradeCriteria: ref({ weights: [], levels: [] }),
      effectiveCriteria: ref({ weights: [], levels: [] }),
      criteriaDirty: ref(false), saveCriteria: vi.fn(async () => {}), resetCriteria: vi.fn(),
      statCards: ref([]), radarOption: ref({}),
    })
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: true, courseId: '1', classId: '1' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.criteria').exists()).toBe(true)
    expect(wrapper.find('.student-criteria').exists()).toBe(false)
  })

  it('正确接收 courseId 和 classId props', async () => {
    const { default: GradesModal } = await import('../../../../components/course/gradesModal/index.vue')
    const wrapper = mount(GradesModal, {
      props: { open: true, courseId: 42, classId: 7 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe(42)
    expect(wrapper.props('classId')).toBe(7)
  })
})
