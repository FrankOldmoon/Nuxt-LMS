/**
 * InputFileList component tests
 * @see modules/base/components/form/inputFileList.vue
 *
 * File list display: icon + name + size + status + delete
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'
import { getFileIcon } from '../../../composables/useFileUploader'
import { formatBytes } from '../../../utils/fileUtils'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).getFileIcon = getFileIcon
  ;(globalThis as any).formatBytes = formatBytes
})

const _globalStubs = {
  UIcon: { template: '<span class="icon" />', props: ['name'] },
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['variant', 'size', 'icon', 'color', 'label'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
    getFileIcon,
    formatBytes,
  },
  stubs: _globalStubs,
}

describe('form/inputFileList.vue', () => {
  it('空文件列表不渲染', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const wrapper = mount(InputFileList, {
      props: { files: [] },
      global: _globalConfig,
    })
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('渲染文件列表', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const files = [
      { name: 'test.pdf', size: 1024, status: 'success', url: 'https://example.com/test.pdf' },
      { name: 'image.png', size: 2048, status: 'uploading', url: '' },
    ]
    const wrapper = mount(InputFileList, {
      props: { files },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('test.pdf')
    expect(wrapper.text()).toContain('image.png')
    // formatBytes
    expect(wrapper.text()).toContain('1.0 KB')
  })

  it('显示上传中状态图标', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const wrapper = mount(InputFileList, {
      props: { files: [{ name: 'uploading.zip', size: 500, status: 'uploading', url: '' }] },
      global: _globalConfig,
    })
    const icons = wrapper.findAll('.icon')
    // uploading status will render a spin icon
    expect(icons.length).toBeGreaterThanOrEqual(1)
  })

  it('非上传状态显示删除按钮', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const wrapper = mount(InputFileList, {
      props: { files: [{ name: 'done.txt', size: 100, status: 'success', url: 'https://example.com/done.txt' }] },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(1)
  })

  it('上传中状态不显示删除按钮', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const wrapper = mount(InputFileList, {
      props: { files: [{ name: 'uploading.txt', size: 100, status: 'uploading', url: '' }] },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(0)
  })

  it('点击删除按钮 emit remove 事件', async () => {
    const { default: InputFileList } = await import('../../../components/form/inputFileList.vue')
    const wrapper = mount(InputFileList, {
      props: { files: [{ name: 'remove.txt', size: 50, status: 'success', url: 'https://example.com/remove.txt' }] },
      global: _globalConfig,
    })
    const btn = wrapper.find('button')
    await btn.trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual([0])
  })
})
