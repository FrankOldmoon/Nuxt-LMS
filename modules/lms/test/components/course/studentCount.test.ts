/**
 * course/studentCount.vue 组件测试
 * @see modules/lms/components/course/studentCount.vue
 *
 * 课程学生人数徽标：UIcon + 数字 + i18n 文案
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/studentCount.vue', () => {
  it('渲染学生人数', async () => {
    const { default: StudentCount } = await import('../../../components/course/studentCount.vue')
    const wrapper = mount(StudentCount, {
      props: { count: 42 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).toContain('course.students')
  })

  it('渲染 0 学生', async () => {
    const { default: StudentCount } = await import('../../../components/course/studentCount.vue')
    const wrapper = mount(StudentCount, {
      props: { count: 0 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('0')
  })

  it('渲染大数字学生数', async () => {
    const { default: StudentCount } = await import('../../../components/course/studentCount.vue')
    const wrapper = mount(StudentCount, {
      props: { count: 12345 },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('12345')
  })

  it('正确接收 count prop', async () => {
    const { default: StudentCount } = await import('../../../components/course/studentCount.vue')
    const wrapper = mount(StudentCount, {
      props: { count: 7 },
      global: _globalConfig,
    })
    expect(wrapper.props('count')).toBe(7)
  })

  it('渲染 UIcon', async () => {
    const { default: StudentCount } = await import('../../../components/course/studentCount.vue')
    const wrapper = mount(StudentCount, {
      props: { count: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('.uicon').exists()).toBe(true)
  })
})
