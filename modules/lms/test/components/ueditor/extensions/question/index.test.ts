/**
 * index core component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/index.vue
 *
 * index.vue wraps Render + Edit, uses inject from 'vue' to get nodeView state
 * Test mount + basic props + exposed methods
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive, defineComponent, h, provide as vueProvide } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // useChapterTask is not in nuxt-stubs globalThis exposure, needs manual addition
  ;(globalThis as any).useChapterTask = () => null
})

const _globalStubs = {
  // Stub Render and Edit to avoid complex dependencies
  Render: {
    template: '<div class="render-stub" />',
    props: ['node', 'inQuiz'],
    emits: ['submitted', 'init'],
    // Expose methods that index.vue calls via renderRef
    setup() {
      const questionData = ref({ name: 'Stub Question', type: 'single' })
      return {
        getQuestionData: () => questionData.value,
        fillFromRecord: () => {},
        showResult: () => ({ rate: 0, record: [] }),
        resetForQuiz: () => {},
        hasAnswer: ref(false),
      }
    },
  },
  Edit: {
    template: '<div class="edit-stub" />',
    props: ['questionId', 'question'],
    emits: ['saved'],
  },
}

const _mocks = { $t: (k: string) => k }

/** Wrapper that provides nodeView inject values via Vue's provide */
function makeNodeViewProvider(showConfig = false) {
  const showConfigRef = ref(showConfig)
  const meta = reactive({ title: '', icon: '', hasSettings: false })
  return {
    showConfigRef,
    meta,
    Provider: defineComponent({
      setup(_, { slots }) {
        vueProvide('nodeViewShowConfig', showConfigRef)
        vueProvide('nodeViewMeta', meta)
        return () => slots.default?.()
      },
    }),
  }
}

describe('question/index.vue', () => {
  it('mounts and renders Render component', async () => {
    const { default: Index } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/question/index.vue'
    )
    const { Provider } = makeNodeViewProvider(false)
    const wrapper = mount({
      render() {
        return h(Provider, () => h(Index, { node: { attrs: { content: 123 } } }))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    expect(wrapper.find('.render-stub').exists()).toBe(true)
  })

  it('shows Edit panel when showConfig is true', async () => {
    const { default: Index } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/question/index.vue'
    )
    const { Provider } = makeNodeViewProvider(true)
    const wrapper = mount({
      render() {
        return h(Provider, () => h(Index, { node: { attrs: { content: 123 } } }))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    // When showConfig=true, should show Edit panel
    expect(wrapper.find('.edit-stub').exists()).toBe(true)
  })

  it('sets nodeViewMeta on mount', async () => {
    const { default: Index } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/question/index.vue'
    )
    const { Provider, meta } = makeNodeViewProvider(false)
    mount({
      render() {
        return h(Provider, () => h(Index, { node: { attrs: { content: 123 } } }))
      },
    }, { global: { stubs: _globalStubs, mocks: _mocks } })
    // index.vue sets meta.title/icon/hasSettings in setup
    expect(meta.title).toBe('题目')
    expect(meta.icon).toBe('i-lucide-circle-help')
    expect(meta.hasSettings).toBe(true)
  })
})
