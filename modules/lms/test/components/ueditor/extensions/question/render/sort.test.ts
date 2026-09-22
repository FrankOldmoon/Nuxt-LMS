/**
 * sort 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/sort.vue
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
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  draggable: {
    template: '<div class="draggable"><div v-for="(item, i) in modelValue" :key="i"><slot name="item" :element="item" :index="i" /></div></div>',
    props: ['modelValue', 'itemKey', 'handle', 'animation', 'class'],
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

describe('question/render/sort.vue', () => {
  const sampleQuestion = {
    type: 'sort',
    name: 'Sort question',
    options: ['Item C', 'Item A', 'Item B'],
    answer: [1, 2, 0],
    point: 3,
    record: [],
    content: '',
  }

  it('mounts and renders sort hint', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.sortRenderHint')
  })

  it('renders draggable items', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.draggable').exists()).toBe(true)
  })

  it('整行可拖拽：不限定 drag handle，鼠标样式落在整行', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    // draggable 不再传 handle，整行任意位置都可按住拖动
    const draggableComp = wrapper.findComponent(_globalStubs.draggable)
    expect(draggableComp.exists()).toBe(true)
    expect(draggableComp.props('handle')).toBeUndefined()
    // 拖拽手柄样式移到整行，旧的 handle 类名不再使用
    expect(wrapper.find('.draggable .cursor-move').exists()).toBe(true)
    expect(wrapper.find('.sort-drag-handle').exists()).toBe(false)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })

  // ── 加固：重新请求不重洗 / 迟到回填不覆盖进行中的排序 ──

  /** 当前渲染出的条目文本（顺序即 dragList 顺序） */
  const items = (wrapper: any) =>
    wrapper.findAll('.draggable > div').map((d: any) => d.text())

  it('同一道题被重新请求（新对象）时不重洗，保留当前顺序', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: { ...sampleQuestion, record: [] }, questionId: 1 },
      global: _globalConfig,
    })
    const before = items(wrapper)

    // 模拟网络重试 / 重新拉取：同一 cid、结构相同，但是新的 question 对象
    await wrapper.setProps({ question: { ...sampleQuestion, record: [] } })
    await flushPromises()

    expect(items(wrapper)).toEqual(before)
  })

  it('学生已开始拖动后，后到的 record 回填不再覆盖当前排序', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: { ...sampleQuestion, record: [] }, questionId: 1 },
      global: _globalConfig,
    })
    const draggableStub = wrapper.findComponent(_globalStubs.draggable)

    // 用户真正拖动：start 事件 + v-model 换成确定的顺序 [1, 0, 2]
    draggableStub.vm.$emit('start')
    draggableStub.vm.$emit('update:modelValue', [
      { originalIndex: 1 }, { originalIndex: 0 }, { originalIndex: 2 },
    ])
    await nextTick()
    const afterDrag = items(wrapper)
    expect(afterDrag[0]).toContain('Item A')  // options[1]
    expect(afterDrag[1]).toContain('Item C')  // options[0]
    expect(afterDrag[2]).toContain('Item B')  // options[2]

    // 服务端记录随后才到达（慢网络场景），顺序与用户当前排序不同
    await wrapper.setProps({ question: { ...sampleQuestion, record: [2, 1, 0] } })
    await flushPromises()

    // 不被覆盖：仍是用户拖出来的顺序
    expect(items(wrapper)).toEqual(afterDrag)
  })

  it('未开始作答时 record 回填仍然生效（回显 / 重新进入）', async () => {
    const { default: SortRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/sort.vue'
    )
    const wrapper = mount(SortRender, {
      props: { question: { ...sampleQuestion, record: [2, 1, 0] }, questionId: 1 },
      global: _globalConfig,
    })
    await flushPromises()

    const texts = items(wrapper)
    expect(texts[0]).toContain('Item B')  // options[2]
    expect(texts[1]).toContain('Item A')  // options[1]
    expect(texts[2]).toContain('Item C')  // options[0]
  })
})
