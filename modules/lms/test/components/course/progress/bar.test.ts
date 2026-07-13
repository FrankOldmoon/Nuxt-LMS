/**
 * course/progress/bar.vue 组件测试
 * @see modules/lms/components/course/progress/bar.vue
 *
 * 课程学习进度条：percent prop 控制宽度
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: {},
}

describe('course/progress/bar.vue', () => {
  it('渲染百分比文字', async () => {
    const { default: ProgressBar } = await import('../../../../components/course/progress/bar.vue')
    const wrapper = mount(ProgressBar, {
      props: { percent: 50 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.text()).toContain('coursePanel.progress')
  })

  it('渲染 0% 进度', async () => {
    const { default: ProgressBar } = await import('../../../../components/course/progress/bar.vue')
    const wrapper = mount(ProgressBar, {
      props: { percent: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('0%')
  })

  it('渲染 100% 进度', async () => {
    const { default: ProgressBar } = await import('../../../../components/course/progress/bar.vue')
    const wrapper = mount(ProgressBar, {
      props: { percent: 100 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('100%')
  })

  it('percent 应用到 width 样式', async () => {
    const { default: ProgressBar } = await import('../../../../components/course/progress/bar.vue')
    const wrapper = mount(ProgressBar, {
      props: { percent: 75 },
      global: _globalConfig,
    })
    // 找到内层进度条 div（带 transition-all class）
    const innerBar = wrapper.find('.transition-all')
    expect(innerBar.exists()).toBe(true)
    expect(innerBar.attributes('style')).toContain('width: 75%')
  })

  it('正确接收 percent prop', async () => {
    const { default: ProgressBar } = await import('../../../../components/course/progress/bar.vue')
    const wrapper = mount(ProgressBar, {
      props: { percent: 33 },
      global: _globalConfig,
    })
    expect(wrapper.props('percent')).toBe(33)
  })
})
