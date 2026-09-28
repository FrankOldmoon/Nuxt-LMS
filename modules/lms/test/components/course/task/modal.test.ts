/**
 * course/task/modal.vue 组件测试
 * @see modules/lms/components/course/task/modal.vue
 *
 * 任务详情弹窗：根据 type 渲染 question/homework/comment/quiz
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import {
  resetAllStubs, setMockI18n,
  getMockTaskReporter,
} from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UIcon: { template: '<span class="uicon" :data-name="name" />', props: ['name'] },
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  QuestionRender: { template: '<div class="question-render" />', props: ['node'] },
  HomeworkRender: { template: '<div class="homework-render" />', props: ['node'] },
  CommentRender: { template: '<div class="comment-render" />', props: ['node'] },
  QuizRender: { template: '<div class="quiz-render" />', props: ['node'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/task/modal.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'question', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: false, courseId: '1', type: 'question', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('type=question 时渲染 QuestionRender', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'question', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.question-render').exists()).toBe(true)
  })

  it('type=homework 时渲染 HomeworkRender', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'homework', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.homework-render').exists()).toBe(true)
  })

  it('type=comment 时渲染 CommentRender', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'comment', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.comment-render').exists()).toBe(true)
  })

  it('type=quiz 时渲染 QuizRender', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'quiz', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.quiz-render').exists()).toBe(true)
  })

  it('status=done 时渲染 success badge', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'question', id: 1, status: 'done' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.done')
  })

  it('正确接收 props', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '42', type: 'homework', id: 5, status: 'partial' },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('courseId')).toBe('42')
    expect(wrapper.props('type')).toBe('homework')
    expect(wrapper.props('id')).toBe(5)
    expect(wrapper.props('status')).toBe('partial')
  })

  it('注入任务上报通道：互动组件提交上报后转发 submitted 事件', async () => {
    const { default: TaskModal } = await import('../../../../components/course/task/modal.vue')
    const wrapper = mount(TaskModal, {
      props: { open: true, courseId: '1', type: 'homework', id: 9, status: 'todo' },
      global: _globalConfig,
    })
    await flushPromises()

    // useChapterTask() 在弹窗内被替换为一条只转发的通道（预览容器无章节上下文）
    const reporter = getMockTaskReporter()
    expect(typeof reporter).toBe('function')
    reporter!('homework', 9, true)
    await flushPromises()

    expect(wrapper.emitted('submitted')?.[0]).toEqual([{ type: 'homework', id: 9 }])
  })
})
