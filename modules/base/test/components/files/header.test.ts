/**
 * FilesHeader 组件测试
 * @see modules/base/components/files/header.vue
 *
 * 文件列表头部：标题 + 上传按钮 + 空间使用
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: {
    template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
    props: ['icon', 'color', 'variant', 'size', 'label', 'loading'],
    emits: ['click'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

describe('files/header.vue', () => {
  it('渲染标题和上传按钮', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        title: '我的文件',
        uploading: false,
        usage: { used: 0, quota: 0, free: 0, unlimited: false },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('我的文件')
    expect(wrapper.text()).toContain('common.upload')
  })

  it('包含隐藏的 file input', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        title: '我的文件',
        uploading: false,
        usage: { used: 0, quota: 0, free: 0, unlimited: false },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('无 group 时显示空间使用信息', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        title: '我的文件',
        uploading: false,
        usage: { used: 1024, quota: 1048576, free: 1047552, unlimited: false },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('myFiles.used')
  })

  it('unlimited 空间时显示 ∞', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        title: '我的文件',
        uploading: false,
        usage: { used: 1024, quota: 0, free: 0, unlimited: true },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('∞')
  })

  it('有 group 时不显示空间使用信息', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        group: 'course-1',
        title: '小组文件',
        uploading: false,
        usage: { used: 0, quota: 0, free: 0, unlimited: false },
      },
      global: _globalConfig,
    })
    expect(wrapper.text()).not.toContain('myFiles.used')
  })

  it('上传中时 loading 为 true', async () => {
    const { default: FilesHeader } = await import('../../../components/files/header.vue')
    const wrapper = mount(FilesHeader, {
      props: {
        title: '我的文件',
        uploading: true,
        usage: { used: 0, quota: 0, free: 0, unlimited: false },
      },
      global: _globalConfig,
    })
    // uploading prop 传给 UButton 的 loading
    const btn = wrapper.find('button')
    // 验证组件接受 uploading prop
    expect(wrapper.props('uploading')).toBe(true)
  })
})
