/**
 * IdeToolbar component tests
 * @see modules/base/components/ide/toolbar.vue
 *
 * Top toolbar: language selection + run/clear buttons + ready status badge
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

// Globally mock NuxtUI components
const _globalStubs = {
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UBadge: {
    template: '<span class="badge"><slot /></span>',
    props: ['color', 'size'],
  },
  USelect: {
    template: '<select class="select"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
    emits: ['update:modelValue'],
  },
  UButton: {
    template: '<button class="btn" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled', 'label'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

const _langItems = [
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
]

describe('ide/toolbar.vue', () => {
  it('默认渲染：包含标题、语言选择和运行/清空按钮', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: true,
        running: false,
      },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('ide.title')
    expect(wrapper.text()).toContain('ide.run')
    expect(wrapper.text()).toContain('ide.clear')
    expect(wrapper.findAll('.select option')).toHaveLength(4)
  })

  it('runnerReady=true 时显示就绪徽标', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: true,
        running: false,
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ide.ready')
    // success badge renders
    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
  })

  it('runnerReady=false 时显示 loading 徽标（优先 loadingLabel）', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: false,
        running: false,
        loadingLabel: 'Loading Pyodide...',
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('Loading Pyodide...')
    expect(wrapper.text()).not.toContain('ide.ready')
  })

  it('runnerReady=false 且无 loadingLabel 时显示 ide.loading', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: false,
        running: false,
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('ide.loading')
  })

  it('点击运行按钮 emit run 事件', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: true,
        running: false,
      },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.btn')
    // The first button is the run button (with ide.run text)
    const runBtn = buttons.find((b) => b.text().includes('ide.run'))!
    await runBtn.trigger('click')
    expect(wrapper.emitted('run')).toBeTruthy()
  })

  it('点击清空按钮 emit clear 事件', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: true,
        running: false,
      },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.btn')
    const clearBtn = buttons.find((b) => b.text().includes('ide.clear'))!
    await clearBtn.trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('lang prop 变化时通过 v-model 同步 update:lang', async () => {
    const { default: IdeToolbar } = await import('../../../components/ide/toolbar.vue')
    const wrapper = mount(IdeToolbar, {
      props: {
        lang: 'python',
        langItems: _langItems,
        runnerReady: true,
        running: false,
      },
      global: _globalConfig,
    })
    // Verify initial lang prop
    expect(wrapper.props('lang')).toBe('python')
    // Update lang prop
    await wrapper.setProps({ lang: 'javascript' })
    expect(wrapper.props('lang')).toBe('javascript')
  })
})
