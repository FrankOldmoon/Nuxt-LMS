/**
 * cellImage 组件测试
 * @see modules/admin/components/table/cellImage.vue
 */
import { describe, it, expect, beforeEach, mount, baseBeforeEach, _globalStubs, _globalConfig } from './_shared'

beforeEach(baseBeforeEach)

describe('table/cellImage.vue', () => {
  it('渲染 UAvatar，src 来自 value', async () => {
    const { default: CellImage } = await import('../../components/table/cellImage.vue')
    const wrapper = mount(CellImage, {
      props: { value: 'http://example.com/a.png' },
      global: _globalConfig,
    })
    const avatar = wrapper.find('.uavatar')
    expect(avatar.exists()).toBe(true)
    expect(avatar.attributes('src')).toBe('http://example.com/a.png')
  })

  it('value 为字符串数字时也能渲染', async () => {
    const { default: CellImage } = await import('../../components/table/cellImage.vue')
    const wrapper = mount(CellImage, {
      props: { value: 123 },
      global: _globalConfig,
    })
    expect(wrapper.find('.uavatar').exists()).toBe(true)
    expect(wrapper.find('.uavatar').attributes('src')).toBe('123')
  })

  it('点击 avatar 后打开预览 modal', async () => {
    const { default: CellImage } = await import('../../components/table/cellImage.vue')
    const wrapper = mount(CellImage, {
      props: { value: 'http://example.com/a.png' },
      global: _globalConfig,
    })
    // 初始无 modal
    expect(wrapper.find('.modal').exists()).toBe(false)
    // 点击 avatar
    await wrapper.find('.uavatar').trigger('click')
    // modal 应出现
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('value 为空字符串时 src 为空', async () => {
    const { default: CellImage } = await import('../../components/table/cellImage.vue')
    const wrapper = mount(CellImage, {
      props: { value: '' },
      global: _globalConfig,
    })
    expect(wrapper.find('.uavatar').exists()).toBe(true)
  })

  it('接受任意 value 类型', async () => {
    const { default: CellImage } = await import('../../components/table/cellImage.vue')
    const wrapper = mount(CellImage, {
      props: { value: null },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
