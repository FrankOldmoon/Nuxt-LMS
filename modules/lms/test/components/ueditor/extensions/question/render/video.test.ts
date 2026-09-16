/**
 * video 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/video.vue
 *
 * video.vue 导入 QuestionRender (render.vue)，需 stub
 * useVideo 使用 useChapterTask，需 expose 到 globalThis
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  async function mountVideo(question: any, triggerAutoSubmit: () => void) {
    const { default: VideoRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/video.vue'
    )
    return mount(VideoRender, {
      props: { question, questionId: 1 },
      global: {
        ..._globalConfig,
        provide: { ..._globalConfig.provide, questionTriggerAutoSubmit: triggerAutoSubmit },
      },
    })
  }

  /** 伪造 video.duration 并派发 loadedmetadata，返回 video 触发助手 */
  async function primeDuration(wrapper: any, duration: number) {
    const el = wrapper.find('video').element as any
    Object.defineProperty(el, 'duration', { value: duration, configurable: true })
    await wrapper.find('video').trigger('loadedmetadata')
  }

  it('无子题：未看完时 hasAnswer 为 false', async () => {
    const trigger = vi.fn()
    const wrapper = await mountVideo(sampleQuestion, trigger)
    await primeDuration(wrapper, 120)
    expect((wrapper.vm as any).hasAnswer).toBe(false)
    expect(trigger).not.toHaveBeenCalled()
  })

  it('无子题：看完视频后 hasAnswer 为 true', async () => {
    const trigger = vi.fn()
    const wrapper = await mountVideo(sampleQuestion, trigger)
    await primeDuration(wrapper, 120)
    await wrapper.find('video').trigger('ended')
    expect((wrapper.vm as any).hasAnswer).toBe(true)
  })

  it('无子题：看完视频自动触发外层提交，且只触发一次', async () => {
    const trigger = vi.fn()
    const wrapper = await mountVideo(sampleQuestion, trigger)
    await primeDuration(wrapper, 120)
    await wrapper.find('video').trigger('ended')
    expect(trigger).toHaveBeenCalledTimes(1)
    // 再次 ended 不重复提交
    await wrapper.find('video').trigger('ended')
    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it('有子题：看完视频不自动提交', async () => {
    const trigger = vi.fn()
    const withSubs = {
      ...sampleQuestion,
      options: { src: 'https://example.com/video.mp4', questions: [{ cid: 2, at: 5 }] },
    }
    const wrapper = await mountVideo(withSubs, trigger)
    await primeDuration(wrapper, 120)
    await wrapper.find('video').trigger('ended')
    expect(trigger).not.toHaveBeenCalled()
  })

  it('reset 后可再次自动提交', async () => {
    const trigger = vi.fn()
    const wrapper = await mountVideo(sampleQuestion, trigger)
    await primeDuration(wrapper, 120)
    await wrapper.find('video').trigger('ended')
    expect(trigger).toHaveBeenCalledTimes(1)
    ;(wrapper.vm as any).reset()
    await wrapper.find('video').trigger('ended')
    expect(trigger).toHaveBeenCalledTimes(2)
  })
})
