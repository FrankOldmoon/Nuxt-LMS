/**
 * fill 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/fill.vue
 *
 * fill 渲染组件无模板内容（内容由父组件渲染），只暴露 submit/reset/fillCorrectAnswer 方法
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext } from '../../../../../../../../test/setup/nuxt-stubs'
import { useFill } from '../../../../../../components/ueditor/extensions/nodes/vue/question/render/useFill'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  stubs: { ueditorRender: { template: '<div />', props: ['json'] } },
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/fill.vue', () => {
  const sampleQuestion = {
    type: 'fill',
    name: 'Fill question',
    options: ['', ''],
    answer: ['hello', 'world'],
    point: 2,
    record: [],
    content: '',
  }

  it('mounts without errors', async () => {
    const { default: FillRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/fill.vue'
    )
    const wrapper = mount(FillRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: FillRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/fill.vue'
    )
    const wrapper = mount(FillRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})

describe('useFill 输入框同步（空格回归）', () => {
  let host: HTMLElement
  let input: HTMLInputElement

  beforeEach(() => {
    resetAllStubs()
    setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
    setMockLmsContext(1, 1)
    // useFill 通过 [data-question-id="x"] .prose 查找填空输入框
    host = document.createElement('div')
    host.setAttribute('data-question-id', '1')
    const prose = document.createElement('div')
    prose.className = 'prose'
    input = document.createElement('input')
    prose.appendChild(input)
    host.appendChild(prose)
    document.body.appendChild(host)
  })

  afterEach(() => {
    host?.remove()
  })

  async function mountFill(fromRecord: any) {
    const question = reactive({
      type: 'fill',
      answer: ['Input Image'],
      options: [''],
      point: 1,
      record: [] as any[],
    })
    const Comp = defineComponent({
      setup() {
        useFill({ question, questionId: 1 })
        return () => h('div')
      },
    })
    mount(Comp, {
      global: {
        provide: {
          questionSubmitted: ref(false),
          questionIsCorrect: ref(false),
          questionFromRecord: fromRecord,
        },
        mocks: { $t: (k: string) => k },
      },
    })
    await nextTick()
    return { question }
  }

  it('用户输入的空格不会被 record 回写吞掉', async () => {
    const { question } = await mountFill(ref(false))
    input.value = 'Input ' // 模拟用户输入（含末尾空格）
    question.record = ['Input'] // 模拟 onInput 写入的 trim 后 record
    await nextTick()
    await nextTick()
    expect(input.value).toBe('Input ')
  })

  it('服务端回填（fromRecord=true）时仍会把作答写回输入框', async () => {
    const { question } = await mountFill(ref(true))
    question.record = ['hello']
    await nextTick()
    await nextTick()
    expect(input.value).toBe('hello')
  })
})
