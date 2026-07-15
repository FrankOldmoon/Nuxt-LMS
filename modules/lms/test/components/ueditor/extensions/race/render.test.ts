/**
 * race render component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockLmsContext, setMockAuthUser, setMockRuntimeConfig } from '../../../../../../../test/setup/nuxt-stubs'

// Stub composables not in nuxt-stubs
;(globalThis as any).useChapterTask = () => null
;(globalThis as any).useUserCard = () => ({ refreshTrigger: ref(0), refresh: () => {} })
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
  onRaceScores: () => () => {},
  sendRaceQuestionEnd: () => {},
  onRaceQuestionEnd: () => () => {},
  sendRaceEnd: () => {},
  onRaceEnd: () => () => {},
  sendRaceOnline: () => {},
  onRaceOnlineUpdate: () => () => {},
})
;(globalThis as any).useClassUsers = () => ({
  classUsers: ref([]),
  students: ref([]),
  teachers: ref([]),
  classUsersLoading: ref(false),
  currentClassId: ref(null),
  fetchUsers: async () => {},
  clearUsers: () => {},
})

beforeEach(() => {
  resetAllStubs()
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
})
