/**
 * chapter/scoreModal.vue 组件测试
 * @see modules/lms/components/chapter/scoreModal.vue
 *
 * 章节得分弹窗：班级学生得分表 + 任务点 + 进度条。
 * 依赖 useChapterScore()，测试中 stub 该 composable。TaskDot/TaskModal 显式 import，
 * 测试中按组件名 stub。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useAuthLms（canEdit 用 isCourseTeacher/hasRole 判定）
  ;(globalThis as any).useAuthLms = () => ({ canEditCourse: () => true, isCourseTeacher: () => true, hasRole: () => true })
})

function mockChapterScore(overrides: any = {}) {
  return {
    students: ref<any[]>([]),
    loading: ref(false),
    scoreData: ref([]),
    taskModalOpen: ref(false),
    taskModalItem: reactive({ type: 'question', id: 0, status: 'todo' }),
    onItemClick: vi.fn(),
    tableRows: ref([]),
    extraColumns: ref([
      { id: 'score', canSort: true, header: 'chapter.chapterScore' },
      { id: 'task', header: 'chapter.task' },
      { id: 'progress', canSort: true, header: 'chapter.progress' },
    ]),
    loadData: vi.fn(),
    ...overrides,
  }
}

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui', 'scrollable'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  ClassUsersTable: {
    template: '<div class="class-users-table" />',
    props: ['rows', 'classId', 'courseId', 'loading', 'hideActions', 'hideTeachers', 'hideNumber', 'extraColumns', 'defaultSort', 'showChart', 'showGroup'],
  },
  TaskDot: { template: '<span class="task-dot" />', props: ['type', 'status', 'id'] },
  TaskModal: { template: '<div class="task-modal" />', props: ['open', 'courseId', 'type', 'id', 'status'] },
  UProgress: { template: '<div class="uprogress" />', props: ['modelValue', 'size'] },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  LmsClassSelector: { template: '<div class="lms-class-selector" />' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/scoreModal.vue', () => {
  it('open=true classId=0 时显示"无班级"提示', async () => {
    ;(globalThis as any).useChapterScore = () => mockChapterScore()
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: true, courseId: 1, chapterId: 1, classId: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.noClass')
  })

  it('open=true classId>0 loading=true 时显示加载中', async () => {
    ;(globalThis as any).useChapterScore = () => mockChapterScore({ loading: ref(true) })
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: true, courseId: 1, chapterId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('common.loading')
  })

  it('open=true classId>0 students 为空时显示"无学生"', async () => {
    ;(globalThis as any).useChapterScore = () => mockChapterScore({ loading: ref(false), students: ref([]) })
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: true, courseId: 1, chapterId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('classSelector.noUsers')
  })

  it('有学生时渲染 ClassUsersTable', async () => {
    ;(globalThis as any).useChapterScore = () =>
      mockChapterScore({
        loading: ref(false),
        students: ref([{ id: 1, name: '张三' }]),
        tableRows: ref([{ id: 1, name: '张三', score: 80, items: [], progress: 0.5 }]),
      })
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: true, courseId: 1, chapterId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.class-users-table').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗内容', async () => {
    ;(globalThis as any).useChapterScore = () => mockChapterScore()
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: false, courseId: 1, chapterId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题 chapter.score', async () => {
    ;(globalThis as any).useChapterScore = () => mockChapterScore()
    const { default: ScoreModal } = await import('../../../components/chapter/scoreModal.vue')
    const wrapper = mount(ScoreModal, {
      props: { open: true, courseId: 1, chapterId: 1, classId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.score')
  })
})
