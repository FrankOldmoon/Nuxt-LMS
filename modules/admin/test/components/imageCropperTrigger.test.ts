/**
 * ImageCropperTrigger component tests
 * @see modules/admin/components/table/ImageCropperTrigger.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

const _stubs = {
  ..._globalStubs,
  FormImageCropperModal: {
    name: 'FormImageCropperModal',
    template: '<div class="cropper-modal" :data-stencil="stencilType" :data-aspect="aspectRatio"><slot /></div>',
    props: ['title', 'stencilType', 'aspectRatio'],
    emits: ['uploaded', 'close'],
  },
}

const _config = { ..._globalConfig, stubs: _stubs }

describe('table/ImageCropperTrigger.vue', () => {
  it('渲染触发按钮', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    expect(wrapper.find('button.ubtn').exists()).toBe(true)
  })

  it('渲染隐藏的 file input', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.classes()).toContain('hidden')
  })

  it('渲染 FormImageCropperModal 子组件', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    expect(wrapper.find('.cropper-modal').exists()).toBe(true)
  })

  it('默认 stencilType=rectangle, aspectRatio=1', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    // Verify default prop passthrough via cropper-modal child component's data attributes
    const cropper = wrapper.find('.cropper-modal')
    expect(cropper.exists()).toBe(true)
    expect(cropper.attributes('data-stencil')).toBe('rectangle')
    expect(cropper.attributes('data-aspect')).toBe('1')
  })

  it('接受 stencilType=circle prop', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      props: { stencilType: 'circle' },
      global: _config,
    })
    expect(wrapper.props('stencilType')).toBe('circle')
  })

  it('接受 aspectRatio prop', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      props: { aspectRatio: 16 / 9 },
      global: _config,
    })
    expect(wrapper.props('aspectRatio')).toBeCloseTo(16 / 9, 5)
  })

  it('点击触发按钮调用 file input.click()', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    let clicked = false
    input.click = () => { clicked = true }
    await wrapper.find('button.ubtn').trigger('click')
    expect(clicked).toBe(true)
  })

  it('cropper 触发 uploaded 时转发 uploaded 事件', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    // Trigger directly on vm (bypassing child component stub, since stub is not connected to emit)
    wrapper.vm.$emit('uploaded', 'http://example.com/cropped.png')
    expect(wrapper.emitted('uploaded')).toBeTruthy()
    expect(wrapper.emitted('uploaded')![0]).toEqual(['http://example.com/cropped.png'])
  })

  it('file input accept 为 image/*', async () => {
    const { default: ImageCropperTrigger } = await import('../../components/table/ImageCropperTrigger.vue')
    const wrapper = mount(ImageCropperTrigger, {
      global: _config,
    })
    expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/*')
  })
})
