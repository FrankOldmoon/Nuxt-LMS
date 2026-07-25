/**
 * InputFile 组件测试
 * @see modules/base/components/form/input-file.vue
 *
 * 文件上传：拖拽 + URL + 网盘选择
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { useFileUploader } from '../../../composables/useFileUploader'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useFileUploader = useFileUploader
})

const _globalStubs = {
  FormInputFileDropzone: {
    name: 'FormInputFileDropzone',
    template: '<div class="dropzone-stub"><slot /></div>',
    props: ['multiple', 'placeholder'],
    emits: ['files-selected', 'url-added', 'drive-open'],
  },
  FilesMyFilesModal: {
    name: 'FilesMyFilesModal',
    template: '<div class="drive-modal-stub" />',
    props: ['open', 'picker', 'multiple'],
    emits: ['update:open', 'confirm'],
  },
  FormInputFileList: {
    name: 'FormInputFileList',
    template: '<div class="file-list-stub" />',
    props: ['files'],
    emits: ['remove'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('form/input-file.vue', () => {
  it('默认渲染包含 dropzone 和 file list', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, { global: _globalConfig })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.dropzone-stub').exists()).toBe(true)
    expect(wrapper.find('.file-list-stub').exists()).toBe(true)
  })

  it('接受 multiple prop', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, {
      props: { multiple: true },
      global: _globalConfig,
    })
    expect(wrapper.props('multiple')).toBe(true)
  })

  it('接受 placeholder prop', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, {
      props: { placeholder: '拖拽文件到此处' },
      global: _globalConfig,
    })
    expect(wrapper.props('placeholder')).toBe('拖拽文件到此处')
  })

  it('接受 modelValue prop（数组）', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, {
      props: { modelValue: ['https://example.com/a.png'], multiple: true },
      global: _globalConfig,
    })
    expect(wrapper.props('modelValue')).toEqual(['https://example.com/a.png'])
  })

  it('drive-open 事件后 driveOpen 变为 true', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, { global: _globalConfig })
    const dropzone = wrapper.findComponent({ name: 'FormInputFileDropzone' })
    dropzone.vm.$emit('drive-open')
    await flushPromises()
    // FilesMyFilesModal 的 open prop 应变为 true
    const modal = wrapper.findComponent({ name: 'FilesMyFilesModal' })
    expect(modal.props('open')).toBe(true)
  })

  it('url-added 事件后 emit update:modelValue', async () => {
    const { default: InputFile } = await import('../../../components/form/input-file.vue')
    const wrapper = mount(InputFile, { global: _globalConfig })
    const dropzone = wrapper.findComponent({ name: 'FormInputFileDropzone' })
    dropzone.vm.$emit('url-added', 'https://example.com/file.pdf')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
})
