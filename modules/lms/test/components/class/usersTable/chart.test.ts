/**
 * class/usersTable/chart.vue component test
 * @see modules/lms/components/class/usersTable/chart.vue
 *
 * Student score bar chart + right-side avatar overlay.
 * Depends on useClassUsersTableContext() (inject), stubbed to globalThis in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  Chart: { template: '<div class="chart" />', props: ['option', 'height'] },
  UAvatar: {
    template: '<span class="avatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  ClientOnly: { template: '<div><slot /></div>' },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupMockContext(overrides: any = {}) {
  const ctx = {
    chartData: ref([]),
    chartOption: ref({}),
    showChart: () => true,
    students: ref([]),
    ...overrides,
  }
  ;(globalThis as any).useClassUsersTableContext = () => ctx
  return ctx
}

describe('class/usersTable/chart.vue', () => {
  it('showChart=true 且有学生时渲染图表', async () => {
    setupMockContext({
      students: ref([{ id: 1, name: 'Alice', avatarImg: '', score: 90 }]),
      chartData: ref([{ id: 1, name: 'Alice', avatarImg: '', score: 90 }]),
    })
    const { default: Chart } = await import('../../../../components/class/usersTable/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.find('.chart').exists()).toBe(true)
  })

  it('showChart=false 时不渲染', async () => {
    setupMockContext({ showChart: () => false, students: ref([{ id: 1 }]) })
    const { default: Chart } = await import('../../../../components/class/usersTable/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.find('.chart').exists()).toBe(false)
  })

  it('学生为空时不渲染', async () => {
    setupMockContext({ showChart: () => true, students: ref([]) })
    const { default: Chart } = await import('../../../../components/class/usersTable/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.find('.chart').exists()).toBe(false)
  })

  it('渲染右侧头像覆盖层', async () => {
    const students = [
      { id: 1, name: 'Alice', avatarImg: '', score: 90 },
      { id: 2, name: 'Bob', avatarImg: '', score: 80 },
    ]
    setupMockContext({
      students: ref(students),
      chartData: ref(students),
    })
    const { default: Chart } = await import('../../../../components/class/usersTable/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    const avatars = wrapper.findAll('.avatar')
    expect(avatars.length).toBe(2)
  })
})
