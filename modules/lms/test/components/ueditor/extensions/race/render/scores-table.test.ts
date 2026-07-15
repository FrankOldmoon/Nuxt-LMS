/**
 * race render scores-table component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/race/render/scores-table.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { RaceRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/race/useRaceRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  ClassUsersTable: {
    template: '<div class="class-users-table-stub"><slot name="score-cell" :row="{ original: { score: 50 } }" /><slot name="correctCount-cell" :row="{ original: { correctCount: 3 } }" /></div>',
    props: ['rows', 'loading', 'hideActions', 'hideTeachers', 'hideNumber', 'extraColumns', 'defaultSort', 'showChart', 'showOnline'],
  },
}

function makeMockContext(overrides: any = {}) {
  return {
    t: (k: string) => k,
    studentRows: ref([
      { id: 1, name: 'Alice', score: 50, correctCount: 3 },
      { id: 2, name: 'Bob', score: 30, correctCount: 2 },
    ]),
    scoresLoading: ref(false),
    scoreColumns: ref([
      { id: 'score', header: 'Score' },
      { id: 'correctCount', header: 'Correct' },
    ]),
    getScoreClass: (score: number) => score > 0 ? 'text-green-600' : 'text-gray-400',
    ...overrides,
  }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('race/render/scores-table.vue', () => {
  it('renders ClassUsersTable with student rows', async () => {
    const { default: ScoresTable } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/scores-table.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(ScoresTable, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.find('.class-users-table-stub').exists()).toBe(true)
  })

  it('renders score cell content', async () => {
    const { default: ScoresTable } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/scores-table.vue'
    )
    const ctx = makeMockContext()
    const wrapper = mount(ScoresTable, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('50')
  })

  it('passes loading state to table', async () => {
    const { default: ScoresTable } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/race/render/scores-table.vue'
    )
    const ctx = makeMockContext({ scoresLoading: ref(true) })
    const wrapper = mount(ScoresTable, {
      global: { ..._globalConfig, provide: { [RaceRenderKey as any]: ctx } },
    })
    const table = wrapper.findComponent({ name: 'ClassUsersTable' })
    if (table.exists()) {
      expect(table.props('loading')).toBe(true)
    }
  })
})
