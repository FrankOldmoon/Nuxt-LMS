/**
 * chapter/quick-answer-modal.vue component test
 * @see modules/lms/components/chapter/quick-answer-modal.vue
 *
 * Quick answer modal: teacher starts/ends/views winner; students submit quick answer.
 * Depends on useChapterQuickAnswer(), stubs the composable to return mock object in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function mockQuickAnswer(overrides: any = {}) {
  return {
    userName: ref('student'),
    qaQuestion: ref(''),
    qaActive: ref(false),
    qaWinner: ref<string | null>(null),
    startQA: vi.fn(),
    submitQA: vi.fn(),
    endQA: vi.fn(),
    resetQA: vi.fn(),
    ...overrides,
  }
}

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'color', 'size', 'variant', 'icon', 'disabled', 'loading'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/quick-answer-modal.vue', () => {
  it('教师 canEdit=true qaActive=false 时显示发起抢答表单', async () => {
    ;(globalThis as any).useChapterQuickAnswer = () => mockQuickAnswer()
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('chapter.quickAnswerStart')
  })

  it('教师 qaActive=true 无胜者时显示等待状态', async () => {
    ;(globalThis as any).useChapterQuickAnswer = () => mockQuickAnswer({ qaActive: ref(true), qaQuestion: ref('1+1=?') })
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.quickAnswerWaiting')
    expect(wrapper.text()).toContain('1+1=?')
  })

  it('教师 qaActive=true 有胜者时显示胜者', async () => {
    ;(globalThis as any).useChapterQuickAnswer = () =>
      mockQuickAnswer({ qaActive: ref(true), qaWinner: ref('小明'), qaQuestion: ref('Q') })
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('小明')
    expect(wrapper.text()).toContain('chapter.quickAnswerWinner')
  })

  it('点击开始抢答按钮调用 startQA', async () => {
    const ctx = mockQuickAnswer()
    ;(globalThis as any).useChapterQuickAnswer = () => ctx
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.quickAnswerStart'))
    await startBtn!.trigger('click')
    expect(ctx.startQA).toHaveBeenCalled()
  })

  it('学生 canEdit=false qaActive=true 无胜者时显示提交按钮', async () => {
    ;(globalThis as any).useChapterQuickAnswer = () =>
      mockQuickAnswer({ qaActive: ref(true), qaQuestion: ref('题目') })
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.quickAnswerSubmit')
  })

  it('学生点击提交按钮调用 submitQA', async () => {
    const ctx = mockQuickAnswer({ qaActive: ref(true), qaQuestion: ref('题目') })
    ;(globalThis as any).useChapterQuickAnswer = () => ctx
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('chapter.quickAnswerSubmit'))
    await submitBtn!.trigger('click')
    expect(ctx.submitQA).toHaveBeenCalled()
  })

  it('学生 canEdit=false qaActive=false 时显示无活跃抢答', async () => {
    ;(globalThis as any).useChapterQuickAnswer = () => mockQuickAnswer({ qaActive: ref(false) })
    const { default: QAModal } = await import('../../../components/chapter/quick-answer-modal.vue')
    const wrapper = mount(QAModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.quickAnswerNoActive')
  })
})
