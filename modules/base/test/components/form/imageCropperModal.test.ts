/**
 * ImageCropperModal 组件测试
 * @see modules/base/components/form/imageCropperModal.vue
 *
 * 使用 mock useImageCropper 避免 vue-advanced-cropper 依赖
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })

  // Mock useImageCropper — 返回简化桩，避免 vue-advanced-cropper 真实渲染
  const StubCropper = defineComponent({
    name: 'StubCropper',
    template: '<div class="stub-cropper" />',
    props: ['src', 'stencilComponent', 'stencilProps'],
  })
  ;(globalThis as any).useImageCropper = (
    _aspectRatio: () => any,
    _stencilType: () => any,
    onUploaded: (url: string) => void,
  ) => {
    const internalOpen = ref(false)
    const imageSrc = ref<string | null>(null)
    const cropperRef = ref<any>(null)
    const uploading = ref(false)

    return {
      Cropper: StubCropper,
      internalOpen,
      imageSrc,
      cropperRef,
      uploading,
      stencil: ref({}),
      stencilProps: ref({}),
      setImage: (file: File) => {
        imageSrc.value = URL.createObjectURL(file)
        internalOpen.value = true
      },
      close: () => {
        internalOpen.value = false
        imageSrc.value = null
      },
      handleCrop: async () => {
        uploading.value = true
        await flushPromises()
        onUploaded('https://example.com/cropped.webp')
        uploading.value = false
        internalOpen.value = false
      },
    }
  }
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['color', 'variant', 'size', 'loading', 'label', 'icon'],
    emits: ['click'],
  },
  UIcon: { template: '<span />', props: ['name'] },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('form/imageCropperModal.vue', () => {
  it('默认渲染（open=false 时不显示内容）', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
  })

  it('接受 title prop', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, {
      props: { title: '裁剪头像' },
      global: _globalConfig,
    })
    expect(wrapper.props('title')).toBe('裁剪头像')
  })

  it('接受 aspectRatio 和 stencilType prop', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, {
      props: { aspectRatio: 1, stencilType: 'circle' },
      global: _globalConfig,
    })
    expect(wrapper.props('aspectRatio')).toBe(1)
    expect(wrapper.props('stencilType')).toBe('circle')
  })

  it('expose setImage 方法', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, { global: _globalConfig })
    const vm: any = wrapper.vm
    expect(typeof vm.setImage).toBe('function')
  })

  it('调用 setImage 后弹窗打开', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, { global: _globalConfig })
    const vm: any = wrapper.vm
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    vm.setImage(file)
    await flushPromises()
    expect(wrapper.html()).toContain('stub-cropper')
  })

  it('点击确认按钮后 emit uploaded 事件', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, { global: _globalConfig })
    const vm: any = wrapper.vm
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    vm.setImage(file)
    await flushPromises()
    // 找到确认按钮（包含 common.confirm 文案）
    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text().includes('common.confirm'))
    expect(confirmBtn).toBeTruthy()
    await confirmBtn!.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('uploaded')).toBeTruthy()
    expect(wrapper.emitted('uploaded')![0]).toEqual(['https://example.com/cropped.webp'])
  })

  it('点击关闭按钮后 emit close 事件', async () => {
    const { default: ImageCropperModal } = await import('../../../components/form/imageCropperModal.vue')
    const wrapper = mount(ImageCropperModal, { global: _globalConfig })
    const vm: any = wrapper.vm
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    vm.setImage(file)
    await flushPromises()
    const buttons = wrapper.findAll('button')
    // 第一个按钮是 X 关闭按钮
    await buttons[0].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
