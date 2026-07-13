/**
 * class/chart.vue 组件测试
 * @see modules/lms/components/class/chart.vue
 *
 * 该组件模板为空（<template></template>），仅验证渲染不报错。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: {},
}

describe('class/chart.vue', () => {
  it('渲染不报错（空模板）', async () => {
    const { default: Chart } = await import('../../../components/class/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染空内容', async () => {
    const { default: Chart } = await import('../../../components/class/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.text()).toBe('')
  })

  it('不产生 DOM 元素', async () => {
    const { default: Chart } = await import('../../../components/class/chart.vue')
    const wrapper = mount(Chart, { global: _globalConfig })
    expect(wrapper.findAll('*').length).toBe(0)
  })
})
