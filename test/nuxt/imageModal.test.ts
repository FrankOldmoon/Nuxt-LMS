import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageModal from '~/components/ueditor/render/imageModal.vue'

// Stub Teleport so content renders in the wrapper DOM
const TeleportStub = {
  name: 'TeleportStub',
  inheritAttrs: false,
  setup(_: any, { slots }: any) {
    return () => slots.default?.()
  },
}

describe('imageModal.vue', () => {
  function makeWrapper(props: Partial<{ open: boolean; images: string[]; initialIndex: number }> = {}) {
    return mount(ImageModal, {
      props: {
        open: true,
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        initialIndex: 0,
        ...props,
      },
      global: {
        stubs: {
          Teleport: TeleportStub,
        },
      },
    })
  }

  it('renders nothing when open is false', () => {
    const wrapper = makeWrapper({ open: false })
    expect(wrapper.find('.image-modal-overlay').exists()).toBe(false)
  })

  it('renders overlay when open is true', () => {
    const wrapper = makeWrapper({ open: true })
    expect(wrapper.find('.image-modal-overlay').exists()).toBe(true)
  })

  it('displays current image index (1-based)', () => {
    const wrapper = makeWrapper({ initialIndex: 1 })
    expect(wrapper.text()).toContain('2 / 3')
  })

  it('shows the current image', () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    const img = wrapper.find('.image-modal-img')
    expect(img.attributes('src')).toBe('img1.jpg')
  })

  it('navigates to next image on next button click', async () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    const buttons = wrapper.findAll('button')
    // prev=0, next=1, close=2
    await buttons[1]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img2.jpg')
  })

  it('navigates to prev image on prev button click', async () => {
    const wrapper = makeWrapper({ initialIndex: 2 })
    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img2.jpg')
  })

  it('wraps around from last to first on next', async () => {
    const wrapper = makeWrapper({ initialIndex: 2 })
    const buttons = wrapper.findAll('button')
    await buttons[1]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img1.jpg')
  })

  it('wraps around from first to last on prev', async () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img3.jpg')
  })

  it('emits update:open false on close button click', async () => {
    const wrapper = makeWrapper({ open: true })
    const buttons = wrapper.findAll('button')
    await buttons[2]!.trigger('click')
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('emits update:open false on overlay click', async () => {
    const wrapper = makeWrapper({ open: true })
    await wrapper.find('.image-modal-overlay').trigger('click')
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('does not close when clicking on content', async () => {
    const wrapper = makeWrapper({ open: true })
    await wrapper.find('.image-modal-content').trigger('click')
    expect(wrapper.emitted('update:open')).toBeFalsy()
  })

  it('clicking a thumbnail switches to that image', async () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    const thumbs = wrapper.findAll('.image-modal-thumb')
    expect(thumbs).toHaveLength(3)
    await thumbs[2]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img3.jpg')
  })

  it('marks the active thumbnail', () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    const thumbs = wrapper.findAll('.image-modal-thumb')
    expect(thumbs[0]!.classes()).toContain('active')
    expect(thumbs[1]!.classes()).not.toContain('active')
  })

  it('clicking image navigates to next', async () => {
    const wrapper = makeWrapper({ initialIndex: 0 })
    await wrapper.find('.image-modal-img').trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('img2.jpg')
  })

  it('handles single image (no wrap needed)', async () => {
    const wrapper = makeWrapper({ images: ['only.jpg'], initialIndex: 0 })
    const buttons = wrapper.findAll('button')
    // With 1 image, prev and next are disabled but still exist
    expect(buttons.length).toBeGreaterThanOrEqual(3)
    await buttons[1]!.trigger('click')
    expect(wrapper.find('.image-modal-img').attributes('src')).toBe('only.jpg')
  })

  it('disables nav buttons when only one image', () => {
    const wrapper = makeWrapper({ images: ['only.jpg'] })
    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })

  it('does not show thumbnails when only one image', () => {
    const wrapper = makeWrapper({ images: ['only.jpg'] })
    expect(wrapper.find('.image-modal-thumbs').exists()).toBe(false)
  })
})
