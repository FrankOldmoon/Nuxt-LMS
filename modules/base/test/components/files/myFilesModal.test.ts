/**
 * MyFilesModal component tests
 * @see modules/base/components/files/myFilesModal.vue
 *
 * File selection modal: inline mode + modal mode
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  FilesMyFilesInner: {
    name: 'FilesMyFilesInner',
    template: '<div class="my-files-inner-stub" />',
    props: ['group', 'picker', 'multiple', 'open'],
    emits: ['confirm'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('files/myFilesModal.vue', () => {
  it('默认 modal 模式（open=false 不显示）', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { open: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('modal 模式 open=true 时显示弹窗', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.find('.my-files-inner-stub').exists()).toBe(true)
  })

  it('inline 模式直接渲染内容', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { inline: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.my-files-inner-stub').exists()).toBe(true)
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('接受 picker 和 multiple prop', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { picker: true, multiple: true },
      global: _globalConfig,
    })
    expect(wrapper.props('picker')).toBe(true)
    expect(wrapper.props('multiple')).toBe(true)
  })

  it('接受 group prop', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { group: 'course-1' },
      global: _globalConfig,
    })
    expect(wrapper.props('group')).toBe('course-1')
  })

  it('confirm 事件后关闭弹窗（非 inline 模式）', async () => {
    const { default: MyFilesModal } = await import('../../../components/files/myFilesModal.vue')
    const wrapper = mount(MyFilesModal, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    const inner = wrapper.findComponent({ name: 'FilesMyFilesInner' })
    inner.vm.$emit('confirm', [{ id: 1, name: 'file.pdf' }])
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })
})
