/**
 * race render 组件测试
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render.vue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser, setMockRuntimeConfig } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })
// 捕获 raceAnswerCorrect 回调，供弹幕浮层渲染测试手动触发
let raceAnswerCorrectCb: ((d: any) => void) | null = null
// raceAnswerCorrect 的取消注册函数（验证卸载时是否注销）
let raceAnswerCorrectOff: () => void = () => {}
;(globalThis as any).useWebSocket = () => ({
  ws: ref(null),
  wsConnected: ref(false),
  connect: () => {},
  disconnect: () => {},
  joinRoom: () => {},
  raceJoin: () => {},
  onRaceJoined: () => () => {},
  sendRaceStart: () => {},
  onRaceStart: () => () => {},
  sendRaceQuestion: () => {},
  onRaceQuestion: () => () => {},
  sendRaceAnswer: () => {},
  onRaceAnswerUpdate: () => () => {},
  onRaceAnswerCorrect: (cb: any) => { raceAnswerCorrectCb = cb; return raceAnswerCorrectOff },
  onRaceScores: () => () => {},
  sendRaceQuestionEnd: () => {},
  onRaceQuestionEnd: () => () => {},
  sendRaceEnd: () => {},
  onRaceEnd: () => () => {},
  sendRaceOnline: () => {},
  onRaceOnlineUpdate: () => () => {},
})
const fetchUsersSpy = vi.fn(async () => {})
;(globalThis as any).useClassUsers = () => ({
  classUsers: ref([]),
  students: ref([]),
  teachers: ref([]),
  classUsersLoading: ref(false),
  currentClassId: ref(null),
  fetchUsers: fetchUsersSpy,
  clearUsers: () => {},
})

beforeEach(() => {
  resetAllStubs()
  raceAnswerCorrectCb = null
  raceAnswerCorrectOff = vi.fn()
  fetchUsersSpy.mockClear()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 1)
  setMockAuthUser({ id: 1, name: 'Teacher', defaultClass: { id: 1 } }, [{ code: 'teacher' }])
  setMockRuntimeConfig({ public: { moduleLms: true } })
})

const _globalStubs = {
  ueditorRender: { template: '<div class="ueditor-render-stub" />', props: ['json'] },
  UButton: { template: '<button @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'label', 'disabled'] },
  UIcon: { template: '<span />', props: ['name'] },
  UModal: { template: '<div v-if="open"><slot name="content" /></div>', props: ['open', 'scrollable'] },
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UInputTags: { template: '<div />', props: ['modelValue', 'placeholder'] },
  UFormField: { template: '<div><slot /></div>', props: ['label', 'size'] },
  UBadge: { template: '<span><slot /></span>', props: ['color'] },
  UAvatar: { template: '<div class="uavatar">{{ text }}</div>', props: ['src', 'alt', 'size', 'text'] },
  ClientOnly: { template: '<div><slot /></div>' },
  ClassUsersTable: { template: '<div class="class-users-table" />', props: ['rows', 'loading', 'hideActions', 'hideTeachers', 'hideNumber', 'extraColumns', 'defaultSort', 'showChart', 'showOnline'] },
  richEditor: { template: '<div />', props: ['modelValue'] },
  Monaco: { template: '<div />', props: ['modelValue', 'language', 'autoFormat'] },
  UeditorContentPicker: { template: '<div v-if="modelValue" />', props: ['modelValue', 'type'] },
  QuestionRender: { template: '<div class="question-stub" />', props: ['node', 'courseId'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string, params?: any) => {
    if (params) {
      let s = k
      for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
      return s
    }
    return k
  } },
}

describe('race/render.vue', () => {
  it('shows placeholder when moduleLms is disabled', async () => {
    setMockRuntimeConfig({ public: { moduleLms: false } })
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '1' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('race.needLms')
  })

  it('renders race wrapper when moduleLms enabled and classId exists', async () => {
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.race-render').exists()).toBe(true)
  })

  it('shows race label when race data is available', async () => {
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '0' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('race.label')
  })

  it('挂载时拉取班级名单以填充计分表', async () => {
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '1' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(fetchUsersSpy).toHaveBeenCalledWith(1, 1)
    wrapper.unmount()
  })

  it('收到 raceAnswerCorrect 后渲染答对者弹幕浮层', async () => {
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '1' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    expect(raceAnswerCorrectCb).toBeTruthy()
    raceAnswerCorrectCb!({ raceCid: 1, from: 'test01', gain: 1 })
    await flushPromises()
    expect(wrapper.find('.race-barrage').exists()).toBe(true)
    expect(wrapper.text()).toContain('test01')
    expect(wrapper.text()).toContain('race.answerCorrectBarrage')
  })

  it('卸载时注销已注册的 WS 回调（避免 handler 累积）', async () => {
    const { default: RaceRender } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/render.vue'
    )
    const wrapper = mount(RaceRender, {
      props: { node: { attrs: { content: '1' } }, courseId: 1 },
      global: _globalConfig,
    })
    await flushPromises()
    wrapper.unmount()
    expect(raceAnswerCorrectOff).toHaveBeenCalled()
  })
})
