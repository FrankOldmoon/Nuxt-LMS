/**
 * video 组件测试 (render)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/question/render/video.vue
 *
 * video.vue 导入 QuestionRender (render.vue)，需 stub
 * useVideo 使用 useChapterTask，需 expose 到 globalThis
 * 不可见自动暂停依赖 IntersectionObserver + visibilitychange，测试内自建桩
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'

/** IntersectionObserver 桩：记录回调与观察目标，供测试手动派发可见比例变化 */
let mockIoCallback: ((entries: any[]) => void) | null = null
let mockIoObserved: any[] = []

class MockIntersectionObserver {
  constructor(cb: (entries: any[]) => void) {
    mockIoCallback = cb
  }
  observe(el: any) { mockIoObserved.push(el) }
  unobserve() { /* noop */ }
  disconnect() { mockIoObserved = [] }
  takeRecords() { return [] }
}

/** 派发一次视口交集变化（ratio 为可见面积比例） */
function triggerViewport(ratio: number) {
  mockIoCallback?.([{ intersectionRatio: ratio, isIntersecting: ratio > 0 }])
}

/** 模拟标签页可见性（document.hidden 在 happy-dom 里是只读 getter，需自行覆盖） */
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  mockIoCallback = null
  mockIoObserved = []
  ;(globalThis as any).IntersectionObserver = MockIntersectionObserver
  ;(globalThis as any).useChapterTask = () => ({
    reportNodeDone: () => {},
    reset: () => {},
  })
})

afterEach(() => {
  if (Object.prototype.hasOwnProperty.call(document, 'hidden')) {
    delete (document as any).hidden
  }
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" :data-name="name" />', props: ['name'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['icon', 'color', 'variant', 'size', 'label', 'disabled'], emits: ['click'] },
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

  // ── 禁止拖动进度条 ──

  /** 自然播放到 t 秒（推进"已自然观看位置"） */
  async function playTo(wrapper: any, t: number) {
    const el = wrapper.find('video').element as any
    el.currentTime = t
    await wrapper.find('video').trigger('timeupdate')
  }

  it('拖动进度条快进会被拉回已观看位置', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    await playTo(wrapper, 10)
    const el = wrapper.find('video').element as any

    el.currentTime = 90                     // 拖动到 90s
    await wrapper.find('video').trigger('seeking')

    expect(el.currentTime).toBe(10)         // 被拉回
  })

  it('拖动进度条回退被允许（可重看）', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    await playTo(wrapper, 10)
    const el = wrapper.find('video').element as any

    el.currentTime = 2
    await wrapper.find('video').trigger('seeking')

    expect(el.currentTime).toBe(2)          // 回退放行
  })

  it('回退重看不会回退已累积的观看进度，之后仍不能快进', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    await playTo(wrapper, 115)              // 看到 115s（≥95%，算通过）
    const el = wrapper.find('video').element as any
    expect((wrapper.vm as any).hasAnswer).toBe(true)

    el.currentTime = 10                     // 回退重看
    await wrapper.find('video').trigger('seeking')
    await playTo(wrapper, 20)               // 重新看到 20s
    expect((wrapper.vm as any).hasAnswer).toBe(true)   // 已累积进度不因回退而丢失

    el.currentTime = 119                    // 超过已观看位置 → 拉回 115
    await wrapper.find('video').trigger('seeking')
    expect(el.currentTime).toBe(115)
  })

  it('容差内的微小抖动不触发拉回', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    await playTo(wrapper, 10)
    const el = wrapper.find('video').element as any

    el.currentTime = 10.5
    await wrapper.find('video').trigger('seeking')

    expect(el.currentTime).toBe(10.5)
  })

  it('自然播放（含大步长）不被拦截，观看进度正常累积', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    expect((wrapper.vm as any).hasAnswer).toBe(false)

    await playTo(wrapper, 120)              // 自然播放到结尾
    expect((wrapper.vm as any).hasAnswer).toBe(true)
  })

  it('reset 后回到开头：可从 0 重新观看，仍不能拖动', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)
    await playTo(wrapper, 10)
    const el = wrapper.find('video').element as any

    ;(wrapper.vm as any).reset()
    expect(el.currentTime).toBe(0)

    el.currentTime = 5
    await wrapper.find('video').trigger('seeking')
    expect(el.currentTime).toBe(0)
  })

  it('按已累积的观看进度恢复位置，恢复点之外仍不能拖动', async () => {
    const wrapper = await mountVideo({ ...sampleQuestion, record: [{ watchedRatio: 0.5 }] }, vi.fn())
    await primeDuration(wrapper, 120)
    const el = wrapper.find('video').element as any
    expect(el.currentTime).toBe(60)         // 恢复到 50% 处

    el.currentTime = 100
    await wrapper.find('video').trigger('seeking')
    expect(el.currentTime).toBe(60)
  })

  it('未看完时状态文案左侧用 blockquote 图标，并提示不可快进', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await primeDuration(wrapper, 120)

    const icons = wrapper.findAll('.uicon').map(i => i.attributes('data-name'))
    expect(icons).toContain('i-lucide-text-quote')   // blockquote 图标
    expect(icons).not.toContain('i-lucide-circle')   // 不再是 radio 圆圈
    expect(wrapper.text()).toContain('question.videoNoSeek')
  })

  // ── 不可见自动暂停 ──

  it('视频滚出视口后自动暂停，可见时不暂停', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await nextTick()
    const el = wrapper.find('video').element as any
    expect(mockIoObserved).toContain(el)          // 已开始监听视口
    const pauseSpy = vi.spyOn(el, 'pause').mockImplementation(() => {})

    triggerViewport(1)
    expect(pauseSpy).not.toHaveBeenCalled()

    triggerViewport(0.2)                          // 大半滚出视口
    expect(pauseSpy).toHaveBeenCalledTimes(1)

    triggerViewport(0.8)                          // 回到视口只恢复"可见"，不自动播放
    expect(pauseSpy).toHaveBeenCalledTimes(1)
  })

  it('标签页被切走时自动暂停，回到前台不自动恢复', async () => {
    const wrapper = await mountVideo(sampleQuestion, vi.fn())
    await nextTick()
    const el = wrapper.find('video').element as any
    const pauseSpy = vi.spyOn(el, 'pause').mockImplementation(() => {})

    setDocumentHidden(true)
    expect(pauseSpy).toHaveBeenCalledTimes(1)

    setDocumentHidden(false)
    expect(pauseSpy).toHaveBeenCalledTimes(1)
  })

  const SubQuestionStub = {
    template: '<button class="sub-answer-correct" @click="$emit(\'submitted\', { isCorrect: true, questionId: 2 })" />',
    props: ['node'],
    emits: ['submitted'],
  }

  /** 播放到 5s 触发子题弹层并答对，返回 wrapper 与 video 元素 */
  async function openAndAnswerSubQuestion() {
    const withSubs = {
      ...sampleQuestion,
      options: { src: 'https://example.com/video.mp4', questions: [{ cid: 2, at: 5 }] },
    }
    const { default: VideoRender } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/question/render/video.vue'
    )
    const wrapper = mount(VideoRender, {
      props: { question: withSubs, questionId: 1 },
      global: {
        ..._globalConfig,
        stubs: { ..._globalStubs, QuestionRender: SubQuestionStub },
        provide: { ..._globalConfig.provide, questionTriggerAutoSubmit: vi.fn() },
      },
    })
    await primeDuration(wrapper, 120)
    const el = wrapper.find('video').element as any
    el.currentTime = 5
    await wrapper.find('video').trigger('timeupdate')
    await wrapper.find('.sub-answer-correct').trigger('click')
    return { wrapper, el }
  }

  it('可见时关闭子题弹层会恢复播放', async () => {
    const { wrapper, el } = await openAndAnswerSubQuestion()
    const playSpy = vi.spyOn(el, 'play').mockResolvedValue(undefined as any)

    const continueBtn = wrapper.findAll('button').find(b => b.text().includes('question.videoContinue'))!
    await continueBtn.trigger('click')
    await nextTick()

    expect(playSpy).toHaveBeenCalled()
  })

  it('切屏后关闭子题弹层不恢复播放', async () => {
    const { wrapper, el } = await openAndAnswerSubQuestion()
    const playSpy = vi.spyOn(el, 'play').mockResolvedValue(undefined as any)

    setDocumentHidden(true)

    const continueBtn = wrapper.findAll('button').find(b => b.text().includes('question.videoContinue'))!
    await continueBtn.trigger('click')
    await nextTick()

    expect(playSpy).not.toHaveBeenCalled()
  })
})
