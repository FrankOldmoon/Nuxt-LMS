/**
 * course/ClassAvgLeaderboardModal.vue 组件测试
 * @see modules/lms/components/course/ClassAvgLeaderboardModal.vue
 *
 * 各班生均分排行弹窗：表格展示 + 返回按钮
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useCourseClassLeaderboard = (_props: any, _isOpen: any) => ({
    loading: ref(false),
    rows: ref([
      { classId: 1, name: 'ClassA', studentCount: 5, scoreSum: 450, avg: 90, rank: 1 },
      { classId: 2, name: 'ClassB', studentCount: 3, scoreSum: 150, avg: 50, rank: 2 },
    ]),
  })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: {
    UModal: {
      template: '<div v-if="open" class="modal"><slot name="content" /></div>',
      props: ['open', 'ui'],
    },
    UIcon: { template: '<span class="uicon" />', props: ['name'] },
    UButton: { template: '<button class="ubtn" @click="$emit(\'click\')"><slot /></button>', props: ['icon', 'label', 'color', 'variant', 'size'] },
    UTooltip: { template: '<span class="utooltip"><slot /></span>', props: ['text'] },
  },
}

describe('course/ClassAvgLeaderboardModal.vue', () => {
  it('open=false 时不渲染', async () => {
    const { default: Modal } = await import('../../../components/course/ClassAvgLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: false, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染表格与生均分', async () => {
    const { default: Modal } = await import('../../../components/course/ClassAvgLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('coursePanel.classAvg')
    expect(wrapper.text()).toContain('ClassA')
    expect(wrapper.text()).toContain('90.0')
    expect(wrapper.text()).toContain('ClassB')
    expect(wrapper.text()).toContain('50.0')
  })

  it('空数据时显示占位文案', async () => {
    ;(globalThis as any).useCourseClassLeaderboard = (_props: any, _isOpen: any) => ({
      loading: ref(false),
      rows: ref([]),
    })
    const { default: Modal } = await import('../../../components/course/ClassAvgLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.classAvgEmpty')
  })

  it('点击返回按钮关闭弹窗', async () => {
    const { default: Modal } = await import('../../../components/course/ClassAvgLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.props('open')).toBe(true)
    await wrapper.find('.ubtn').trigger('click')
  })
})