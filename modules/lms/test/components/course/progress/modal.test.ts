/**
 * course/progress/modal.vue 组件测试
 * @see modules/lms/components/course/progress/modal.vue
 *
 * 课程进度弹窗：用户选择 + 总进度 + 章节表格 + 任务弹窗
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseProgress
  ;(globalThis as any).useCourseProgress = (_props: any, _isOpen: any, _ui: any) => ({
    loading: ref(false),
    taskModalOpen: ref(false),
    taskModalItem: reactive({ type: '', id: 0, status: 'todo' }),
    canSelectStudent: ref(false),
    tableData: ref([]),
    expanded: ref({}),
    columns: ref([]),
    totalCount: ref(0),
    passedCount: ref(0),
    overallProgress: ref(null),
    onImpersonated: vi.fn(),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UTable: { template: '<div class="utable" />', props: ['data', 'columns', 'expanded', 'getSubRows', 'ui'] },
  CourseUserSelect: { template: '<div class="user-select" />', props: ['courseId'] },
  TaskModal: { template: '<div class="task-modal" />', props: ['open', 'courseId', 'type', 'id', 'status'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/progress/modal.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: ProgressModal } = await import('../../../../components/course/progress/modal.vue')
    const wrapper = mount(ProgressModal, {
      props: { open: true, courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: ProgressModal } = await import('../../../../components/course/progress/modal.vue')
    const wrapper = mount(ProgressModal, {
      props: { open: false, courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('overallProgress 非 null 时渲染总进度', async () => {
    ;(globalThis as any).useCourseProgress = (_props: any, _isOpen: any, _ui: any) => ({
      loading: ref(false), taskModalOpen: ref(false),
      taskModalItem: reactive({ type: '', id: 0, status: 'todo' }),
      canSelectStudent: ref(false), tableData: ref([]), expanded: ref({}),
      columns: ref([]), totalCount: ref(10), passedCount: ref(5),
      overallProgress: ref(50), onImpersonated: vi.fn(),
    })
    const { default: ProgressModal } = await import('../../../../components/course/progress/modal.vue')
    const wrapper = mount(ProgressModal, {
      props: { open: true, courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('50%')
  })

  it('canSelectStudent=true 时渲染用户选择器', async () => {
    ;(globalThis as any).useCourseProgress = (_props: any, _isOpen: any, _ui: any) => ({
      loading: ref(false), taskModalOpen: ref(false),
      taskModalItem: reactive({ type: '', id: 0, status: 'todo' }),
      canSelectStudent: ref(true), tableData: ref([]), expanded: ref({}),
      columns: ref([]), totalCount: ref(0), passedCount: ref(0),
      overallProgress: ref(null), onImpersonated: vi.fn(),
    })
    const { default: ProgressModal } = await import('../../../../components/course/progress/modal.vue')
    const wrapper = mount(ProgressModal, {
      props: { open: true, courseId: '1', navigation: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.user-select').exists()).toBe(true)
  })

  it('正确接收 courseId 和 navigation props', async () => {
    const { default: ProgressModal } = await import('../../../../components/course/progress/modal.vue')
    const wrapper = mount(ProgressModal, {
      props: { open: true, courseId: '42', navigation: [{ label: 'ch1', to: '/c/1/1' }] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe('42')
    expect(wrapper.props('navigation')).toEqual([{ label: 'ch1', to: '/c/1/1' }])
  })
})
