/**
 * InputFileDropzone component tests
 * @see modules/base/components/form/inputFileDropzone.vue
 *
 * Drag upload area: click to select + drag + URL input + drive button
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'disabled'],
    emits: ['click'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown.enter="$emit(\'keydown.enter\', $event)" />',
    props: ['modelValue', 'placeholder', 'icon', 'size'],
    emits: ['update:modelValue', 'keydown.enter'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('form/inputFileDropzone.vue', () => {
  it('默认渲染包含拖拽区域和 URL 输入', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('upload.dragHint')
    expect(wrapper.text()).toContain('upload.clickHint')
  })

  it('显示 placeholder（覆盖默认提示）', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, {
      props: { placeholder: '自定义提示' },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('自定义提示')
  })

  it('接受 multiple prop', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, {
      props: { multiple: true },
      global: _globalConfig,
    })
    expect(wrapper.props('multiple')).toBe(true)
  })

  it('包含隐藏的 file input', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, { global: _globalConfig })
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
  })

  it('拖拽 drop 时 emit files-selected', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, { global: _globalConfig })
    const dropZone = wrapper.find('div')
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })
    await dropZone.trigger('drop', { dataTransfer: { files: [file] } })
    expect(wrapper.emitted('files-selected')).toBeTruthy()
    expect(wrapper.emitted('files-selected')![0][0]).toHaveLength(1)
  })

  it('点击网盘按钮 emit drive-open', async () => {
    const { default: InputFileDropzone } = await import('../../../components/form/inputFileDropzone.vue')
    const wrapper = mount(InputFileDropzone, { global: _globalConfig })
    // Find the button corresponding to myFiles.pickFromDrive
    const buttons = wrapper.findAll('button')
    const driveBtn = buttons.find((b) => b.text().includes('myFiles.pickFromDrive'))
    expect(driveBtn).toBeTruthy()
    await driveBtn!.trigger('click')
    expect(wrapper.emitted('drive-open')).toBeTruthy()
  })
})
