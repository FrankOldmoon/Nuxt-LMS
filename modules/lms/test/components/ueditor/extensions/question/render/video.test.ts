/**
 * video 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/video.vue
 *
 * video.vue 导入 QuestionRender (render.vue)，需 stub
 * useVideo 使用 useChapterTask，需 expose 到 globalThis
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useChapterTask (used by useVideo)
  ;(globalThis as any).useChapterTask = () => ({
    reportNodeDone: () => {},
    reset: () => {},
  })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['icon', 'color', 'variant', 'size', 'label', 'disabled'] },
  QuestionRender: { template: '<div class="question-render-stub" />', props: ['node'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  provide: {
    questionSubmitted: ref(false),
    questionIsCorrect: ref(false),
    questionFromRecord: ref(false),
    inQuiz: false,
  },
  mocks: { $t: (k: string) => k },
}

describe('question/render/video.vue', () => {
  const sampleQuestion = {
    type: 'video',
    name: 'Video question',
    options: { src: 'https://example.com/video.mp4', questions: [] },
    answer: [],
    point: 1,
    record: [],
    content: '',
  }

  it('mounts and renders video player when src is present', async () => {
    const { default: VideoRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/video.vue'
    )
    const wrapper = mount(VideoRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('video').exists()).toBe(true)
  })

  it('shows placeholder when no video src', async () => {
    const { default: VideoRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/video.vue'
    )
    const wrapper = mount(VideoRender, {
      props: { question: { ...sampleQuestion, options: { src: '', questions: [] } }, questionId: 1 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('question.videoSelectHint')
  })

  it('exposes submit/reset/fillCorrectAnswer methods', async () => {
    const { default: VideoRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/video.vue'
    )
    const wrapper = mount(VideoRender, {
      props: { question: sampleQuestion, questionId: 1 },
      global: _globalConfig,
    })
    const vm = wrapper.vm as any
    expect(typeof vm.submit).toBe('function')
    expect(typeof vm.reset).toBe('function')
    expect(typeof vm.fillCorrectAnswer).toBe('function')
  })
})
