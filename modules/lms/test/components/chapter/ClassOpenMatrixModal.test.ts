/**
 * chapter/ClassOpenMatrixModal.vue 组件测试
 * @see modules/lms/components/chapter/ClassOpenMatrixModal.vue
 *
 * 章节×班级开放矩阵弹窗：复用导航树 → UTable 树形（行=章节树，列=开放班级）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useSidebarNav：与 chapter progress 同源的导航树
  ;(globalThis as any).useSidebarNav = () => ({
    navigation: ref([
      { label: 'Home', to: '/course/1' },
      {
        label: '第一章',
        to: '/course/1/11',
        children: [
          { label: '第一课', to: '/course/1/11' },
          { label: '第二课', to: '/course/1/12' },
        ],
      },
    ]),
  })
  // stub useClassOpenMatrix
  ;(globalThis as any).useClassOpenMatrix = (_props: any, _isOpen: any) => ({
    loading: ref(false),
    chapters: ref([{ id: 11, name: '第一课', isOpen: false }, { id: 12, name: '第二课', isOpen: true }]),
    classes: ref([{ id: 101, name: '一班' }]),
    openMap: ref({}),
    isOpenFor: (cid: number, cls: number) => (cid === 11 && cls === 101),
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
    UTable: { template: '<div class="utable"><slot /></div>', props: ['data', 'columns', 'expanded', 'getSubRows', 'ui'] },
  },
}

describe('chapter/ClassOpenMatrixModal.vue', () => {
  it('open=false 时不渲染', async () => {
    const { default: Modal } = await import('../../../components/chapter/ClassOpenMatrixModal.vue')
    const wrapper = mount(Modal, { props: { open: false, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染弹窗与 UTable', async () => {
    const { default: Modal } = await import('../../../components/chapter/ClassOpenMatrixModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.find('.utable').exists()).toBe(true)
  })

  it('无开放班级时显示占位', async () => {
    ;(globalThis as any).useClassOpenMatrix = (_props: any, _isOpen: any) => ({
      loading: ref(false), chapters: ref([]), classes: ref([]), openMap: ref({}), isOpenFor: () => false,
    })
    const { default: Modal } = await import('../../../components/chapter/ClassOpenMatrixModal.vue')
    const wrapper = mount(Modal, { props: { open: true, courseId: '1' }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.noOpenClasses')
  })
})