/**
 * lms/recordsModal/quiz/index.vue 组件测试
 * @see modules/lms/components/lms/recordsModal/quiz/index.vue
 *
 * 测验记录弹窗：UModal + ClassUsersTable + 每题答题状态列
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// mock useQuizRecords（本地导入）
vi.mock('../../../../../components/lms/recordsModal/quiz/useQuizRecords', () => {
  // 提升到工厂作用域：所有 useQuizRecords() 调用共享同一个 fetchRecords mock
  const fetchRecords = vi.fn()
  return {
    useQuizRecords: (props: any, emit: any) => {
      const { ref, computed }: any = globalThis as any
      return {
        open: computed({
          get: () => props.modelValue,
          set: (v: boolean) => emit('update:modelValue', v),
        }),
        rows: ref([]),
        pending: ref(false),
        extraColumns: computed(() => {
          const cols = [
            { id: 'score', header: 'Score', canSort: true },
            { id: 'correctRate', header: 'Rate', canSort: true },
            { id: 'submitCount', header: 'Count', canSort: true },
          ]
          props.questions.forEach((q: any, idx: number) => {
            cols.push({ id: `q${q.id}`, header: `Q${idx + 1}`, canSort: true })
          })
          return cols
        }),
        defaultSort: [{ id: 'score', desc: true }],
        fetchRecords,
        getQuestionRecord: () => null,
        scoreClass: () => '',
        formatRate: () => '0%',
        rateIcon: () => 'i-lucide-check',
        rateIconClass: () => '',
        summary: computed(() => ({ total: 0, submitted: 0, avgScore: 0, passCount: 0, passRate: 0, topScore: 0 })),
        detailOpen: ref(false),
        detailRow: ref(null),
        openDetail: () => {},
        closeDetail: () => {},
        getInitialRecord: () => null,
      }
    },
  }
})

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="body" /></div>',
    props: ['open', 'scrollable', 'fullscreen'],
  },
  ClassUsersTable: {
    template: '<div class="class-users-table" />',
    props: ['rows', 'loading', 'extraColumns', 'hideActions', 'hideTeachers', 'defaultSort'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  UButton: {
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
    props: ['icon', 'variant', 'size', 'loading', 'disabled', 'label'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/recordsModal/quiz/index.vue', () => {
  it('modelValue=true 时渲染弹窗', async () => {
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 100, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('modelValue=false 时不渲染弹窗', async () => {
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: false, courseId: 1, cid: 100, quizPoint: 100, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染测验记录标题', async () => {
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 100, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('record.quizRecords')
  })

  it('渲染 ClassUsersTable', async () => {
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 100, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.class-users-table').exists()).toBe(true)
  })

  it('正确接收 quizPoint prop', async () => {
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 50, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('quizPoint')).toBe(50)
  })

  it('正确接收 questions prop', async () => {
    const questions = [{ id: 1, point: 10 }, { id: 2, point: 20 }]
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 100, questions },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('questions')).toEqual(questions)
  })

  it('点击刷新按钮触发 fetchRecords', async () => {
    const { useQuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/useQuizRecords')
    const mocked = useQuizRecords as any as () => { fetchRecords: ReturnType<typeof vi.fn> }
    const { default: QuizRecords } = await import('../../../../../components/lms/recordsModal/quiz/index.vue')
    const wrapper = mount(QuizRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, quizPoint: 100, questions: [] },
      global: _globalConfig,
    })
    await flushPromises()
    const refreshBtn = wrapper.find('button')
    expect(refreshBtn.exists()).toBe(true)
    await refreshBtn.trigger('click')
    await flushPromises()
    expect(mocked().fetchRecords).toHaveBeenCalled()
  })
})
