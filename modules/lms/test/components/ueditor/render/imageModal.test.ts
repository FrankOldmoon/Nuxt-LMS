// ueditor/render/imageModal.vue component tests
// @see modules/lms/components/ueditor/render/imageModal.vue
//
// Fullscreen image preview modal with Teleport to body.
// Features: prev/next navigation, thumbnail strip, keyboard shortcuts, PNG white bg.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UButton: true,
    Teleport: true,
    Transition: false,
  },
}

describe('ueditor/render/imageModal.vue', () => {
  it('mounts without error when open is false', async () => {
    const { default: ImageModal } = await import('../../../../components/ueditor/render/imageModal.vue')
    const wrapper = mount(ImageModal, {
      props: { open: false, images: ['a.png', 'b.png'], initialIndex: 0 },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders overlay when open is true with images', async () => {
    const { default: ImageModal } = await import('../../../../components/ueditor/render/imageModal.vue')
    const wrapper = mount(ImageModal, {
      props: { open: true, images: ['a.png', 'b.png'], initialIndex: 0 },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('image-modal-overlay')
    expect(wrapper.find('img').attributes('src')).toBe('a.png')
  })

  it('displays correct counter text (1 / N)', async () => {
    const { default: ImageModal } = await import('../../../../components/ueditor/render/imageModal.vue')
    const wrapper = mount(ImageModal, {
      props: { open: true, images: ['a.png', 'b.png', 'c.png'], initialIndex: 0 },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('1 / 3')
  })

  it('emits update:open(false) when close is called', async () => {
    const { default: ImageModal } = await import('../../../../components/ueditor/render/imageModal.vue')
    const wrapper = mount(ImageModal, {
      props: { open: true, images: ['a.png'], initialIndex: 0 },
      global: _globalConfig,
    })
    // Click the overlay to trigger close
    await wrapper.find('.image-modal-overlay').trigger('click')
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('shows current image based on initialIndex', async () => {
    const { default: ImageModal } = await import('../../../../components/ueditor/render/imageModal.vue')
    const wrapper = mount(ImageModal, {
      props: { open: true, images: ['a.png', 'b.png'], initialIndex: 1 },
      global: _globalConfig,
    })
    expect(wrapper.find('img').attributes('src')).toBe('b.png')
    expect(wrapper.html()).toContain('2 / 2')
  })
})
