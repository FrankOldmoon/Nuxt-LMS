/**
 * classify 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/classify.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  draggable: {
    template: '<div class="draggable"><div v-for="(item, i) in modelValue" :key="i"><slot name="item" :element="item" /></div></div>',
    props: ['modelValue', 'itemKey', 'group', 'animation', 'class'],
    emits: ['start', 'change', 'update:modelValue'],
  },
}

const _globalConfig = {
  stubs: _globalStubs,
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/classify.vue', () => {
  const sampleQuestion = {
    type: 'classify',
    name: 'Classify question',
    options: [
      { name: 'Fruits', items: ['Apple', 'Banana'] },
      { name: 'Vegetables', items: ['Carrot', 'Tomato'] },
    ],
    answer: [0, 0, 1, 1],
    point: 4,
    record: [],
    content: '',
  }

  it('mounts and renders classify hint', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.classifyRenderHint')
  })

  it('renders category names', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Fruits')
    expect(wrapper.text()).toContain('Vegetables')
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })

  // ── 加固：重新请求不重洗 / 迟到回填不覆盖进行中的分类 ──

  /** 各 draggable（池子 + 各分类桶）里的条目数 */
  const counts = (wrapper: any) =>
    wrapper.findAll('.draggable').map((d: any) => d.element.children.length)

  /**
   * 挂载后让 record "后到"：模拟真实的回填时序。
   * 注意 mount 时 props 里的 record 会先被 initBuckets → doSyncRecord 写成 -1，
   * 真正的回显是 fetchRecord 回来后替换 question.record（新数组）触发的。
   */
  async function mountAndBackfill(record: number[]) {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: { ...sampleQuestion, record: [] }, questionId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    await wrapper.setProps({ question: { ...sampleQuestion, record } })
    await flushPromises()
    return wrapper
  }

  it('未开始作答时 record 回填生效（回显 / 重新进入）', async () => {
    const wrapper = await mountAndBackfill([0, 0, 1, 1])
    // 4 项都按 record 归位，池子清空
    expect(counts(wrapper)).toEqual([0, 2, 2])
  })

  it('同一道题被重新请求（新对象）时不清空已归位的分桶', async () => {
    const wrapper = await mountAndBackfill([0, 0, 1, 1])
    expect(counts(wrapper)).toEqual([0, 2, 2])

    // 模拟网络重试 / 重新拉取：同一 cid、结构相同，但是新的 question 对象
    await wrapper.setProps({ question: { ...sampleQuestion, record: [0, 0, 1, 1] } })
    await flushPromises()

    expect(counts(wrapper)).toEqual([0, 2, 2])
  })

  it('学生已开始拖动后，后到的 record 回填不再覆盖分桶', async () => {
    const { default: ClassifyRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/classify.vue'
    )
    const wrapper = mount(ClassifyRender, {
      props: { question: { ...sampleQuestion, record: [] }, questionId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    // 初始：4 项全在池子里
    expect(counts(wrapper)).toEqual([4, 0, 0])

    // 用户真正开始拖动（vuedraggable 的 start 事件）
    wrapper.findComponent(_globalStubs.draggable).vm.$emit('start')
    await nextTick()

    // 服务端记录随后才到达（慢网络场景）
    await wrapper.setProps({ question: { ...sampleQuestion, record: [0, 0, 1, 1] } })
    await flushPromises()

    expect(counts(wrapper)).toEqual([4, 0, 0])
  })
})
