/**
 * puzzle component test (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/puzzle.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  stubs: {},
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/puzzle.vue', () => {
  const sampleQuestion = {
    type: 'puzzle',
    name: 'Puzzle question',
    options: { url: 'https://example.com/image.jpg', split: 3 },
    answer: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders puzzle hint', async () => {
    const { default: PuzzleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/puzzle.vue'
    )
    const wrapper = mount(PuzzleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.puzzleRenderHint')
  })

  it('renders puzzle grid when image url is present', async () => {
    const { default: PuzzleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/puzzle.vue'
    )
    const wrapper = mount(PuzzleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    // puzzle grid should have 9 pieces (3x3)
    const pieces = wrapper.findAll('.grid > div')
    expect(pieces.length).toBe(9)
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: PuzzleRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/puzzle.vue'
    )
    const wrapper = mount(PuzzleRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
