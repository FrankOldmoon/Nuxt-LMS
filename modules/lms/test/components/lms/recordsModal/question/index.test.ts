/**
 * lms/recordsModal/question/index.vue 组件测试
 * @see modules/lms/components/lms/recordsModal/question/index.vue
 *
 * 题目记录弹窗：UModal + ClassUsersTable + 选项分布柱状图
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

// mock useQuestionRecords（本地导入）
vi.mock('../../../../../components/lms/recordsModal/question/useQuestionRecords', () => {
  // 提升到工厂作用域：所有 useQuestionRecords() 调用共享同一个 fetchRecords mock
  const fetchRecords = vi.fn()
  return {
    useQuestionRecords: (props: any, emit: any) => {
      const { ref, computed }: any = globalThis as any
      return {
        open: computed({
          get: () => props.modelValue,
          set: (v: boolean) => emit('update:modelValue', v),
        }),
        rows: ref([]),
        pending: ref(false),
        extraColumns: computed(() => [
          { id: 'record', header: 'Record' },
          { id: 'score', header: 'Score', canSort: true },
        ]),
        defaultSort: [{ id: 'score', desc: true }],
        fetchRecords,
        recordIcon: () => 'i-lucide-check',
        recordIconClass: () => 'text-success',
        formatUserAnswer: () => ['A'],
        answerItemClass: () => '',
        formatCorrectRate: () => '100%',
        showOptionChart: ref(false),
        optionChartOption: ref({}),
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
  ClientOnly: { template: '<div class="client-only"><slot /></div>' },
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/recordsModal/question/index.vue', () => {
  it('modelValue=true 时渲染弹窗', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('modelValue=false 时不渲染弹窗', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: false, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染题目记录标题', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('record.questionRecords')
  })

  it('渲染 ClassUsersTable', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.class-users-table').exists()).toBe(true)
  })

  it('showOptionChart=false 时不渲染柱状图', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.chart').exists()).toBe(false)
  })

  it('正确接收 question prop', async () => {
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100, question: { type: 'single', options: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.props('question')).toEqual({ type: 'single', options: [] })
  })

  it('点击刷新按钮触发 fetchRecords', async () => {
    const { useQuestionRecords } = await import('../../../../../components/lms/recordsModal/question/useQuestionRecords')
    const mocked = useQuestionRecords as any as () => { fetchRecords: ReturnType<typeof vi.fn> }
    const { default: QuestionRecords } = await import('../../../../../components/lms/recordsModal/question/index.vue')
    const wrapper = mount(QuestionRecords, {
      props: { modelValue: true, courseId: 1, cid: 100 },
      global: _globalConfig,
    })
    await flushPromises()
    // 找标题旁刷新图标按钮并点击
    const refreshBtn = wrapper.find('button')
    expect(refreshBtn.exists()).toBe(true)
    await refreshBtn.trigger('click')
    await nextTick()
    await flushPromises()
    expect(mocked().fetchRecords).toHaveBeenCalled()
  })
})
