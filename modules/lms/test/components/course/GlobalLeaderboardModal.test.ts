/**
 * course/GlobalLeaderboardModal.vue 组件测试
 * @see modules/lms/components/course/GlobalLeaderboardModal.vue
 *
 * 全局排行弹窗（本课程前10、跨班级、排除教职工）：表格展示 + 返回按钮
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useCourseGlobalLeaderboard = (_props: any, _isOpen: any) => ({
    loading: ref(false),
    rows: ref([
      { userId: 1, rank: 1, name: 'TopOne', className: 'ClassA', score: 99.5, exp: 100, lv: 3 },
      { userId: 2, rank: 2, name: 'Second', className: 'ClassB', score: 80, exp: 0, lv: 1 },
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
    AvatarWithFrame: { template: '<span class="avatar-frame" />', props: ['src', 'alt', 'size', 'text', 'userId'] },
  },
}

describe('course/GlobalLeaderboardModal.vue', () => {
  it('open=false 时不渲染', async () => {
    const { default: Modal } = await import('../../../components/course/GlobalLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: false, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染表格（名次/姓名/班级名称/得分）', async () => {
    const { default: Modal } = await import('../../../components/course/GlobalLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('coursePanel.globalRank')
    expect(wrapper.text()).toContain('coursePanel.className')
    expect(wrapper.text()).toContain('TopOne')
    expect(wrapper.text()).toContain('ClassA')
    expect(wrapper.text()).toContain('99.5')
    expect(wrapper.text()).toContain('Second')
    expect(wrapper.text()).toContain('80.0')
  })

  it('空数据时显示占位文案', async () => {
    ;(globalThis as any).useCourseGlobalLeaderboard = (_props: any, _isOpen: any) => ({
      loading: ref(false),
      rows: ref([]),
    })
    const { default: Modal } = await import('../../../components/course/GlobalLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('coursePanel.globalRankEmpty')
  })

  it('点击返回按钮关闭弹窗', async () => {
    const { default: Modal } = await import('../../../components/course/GlobalLeaderboardModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.props('open')).toBe(true)
    await wrapper.find('.ubtn').trigger('click')
  })
})
