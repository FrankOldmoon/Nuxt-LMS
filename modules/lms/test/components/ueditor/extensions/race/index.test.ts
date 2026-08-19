/**
 * race index 组件测试 (TipTap node-view)
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/index.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
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
  mocks: { $t: (k: string) => k },
}

describe('race/index.vue', () => {
  it('mounts and sets meta title/icon', async () => {
    const { default: RaceIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/index.vue'
    )
    const meta = reactive({ title: '', icon: '', hasSettings: false })
    const wrapper = mount(RaceIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: {
        ..._globalConfig,
        provide: {
          nodeViewShowConfig: ref(false),
          nodeViewMeta: meta,
        },
      },
    })
    await flushPromises()
    expect(meta.title).toBe('race.label')
    expect(meta.icon).toBe('i-lucide-trophy')
    expect(meta.hasSettings).toBe(true)
  })

  it('renders the race node wrapper', async () => {
    const { default: RaceIndex } = await import(
      '../../../../../components/ueditor/extensions/nodes/vue/race/index.vue'
    )
    const wrapper = mount(RaceIndex, {
      props: {
        node: { attrs: { content: '1' } },
        updateAttributes: () => {},
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.race-wrapper').exists()).toBe(true)
  })
})
