/**
 * ueditor/render/nodes/image.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/image.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/render/nodes/image.vue', () => {
  it('renders an <img> with src from attrs', async () => {
    const { default: ImageView } = await import('../../../../../components/ueditor/render/nodes/image.vue')
    const wrapper = mount(ImageView, {
      props: { node: { type: 'image', attrs: { src: 'https://example.com/photo.png' } } },
      global: _globalConfig,
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/photo.png')
  })

  it('does not render img when src is missing', async () => {
    const { default: ImageView } = await import('../../../../../components/ueditor/render/nodes/image.vue')
    const wrapper = mount(ImageView, {
      props: { node: { type: 'image', attrs: {} } },
      global: _globalConfig,
    })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('applies flip transform when flipX is set', async () => {
    const { default: ImageView } = await import('../../../../../components/ueditor/render/nodes/image.vue')
    const wrapper = mount(ImageView, {
      props: { node: { type: 'image', attrs: { src: '/x.png', flipX: true } } },
      global: _globalConfig,
    })
    const img = wrapper.find('img')
    expect(img.attributes('style')).toContain('rotateX(180deg)')
  })

  it('uses inline-block display when inline=true', async () => {
    const { default: ImageView } = await import('../../../../../components/ueditor/render/nodes/image.vue')
    const wrapper = mount(ImageView, {
      props: { node: { type: 'image', attrs: { src: '/x.png', inline: true } } },
      global: _globalConfig,
    })
    expect(wrapper.html()).toContain('inline-block')
  })
})
