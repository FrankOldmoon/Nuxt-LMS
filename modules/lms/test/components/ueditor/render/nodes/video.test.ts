/**
 * ueditor/render/nodes/video.vue component test
 * @see modules/lms/components/ueditor/render/nodes/video.vue
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

describe('ueditor/render/nodes/video.vue', () => {
  it('renders a <video> with src and controls', async () => {
    const { default: VideoView } = await import('../../../../../components/ueditor/render/nodes/video.vue')
    const wrapper = mount(VideoView, {
      props: { node: { type: 'video', attrs: { src: 'https://example.com/v.mp4' } } },
      global: _globalConfig,
    })
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe('https://example.com/v.mp4')
    expect(video.attributes('controls')).toBeDefined()
  })

  it('applies width/height from attrs', async () => {
    const { default: VideoView } = await import('../../../../../components/ueditor/render/nodes/video.vue')
    const wrapper = mount(VideoView, {
      props: { node: { type: 'video', attrs: { src: '/v.mp4', width: 320, height: 240 } } },
      global: _globalConfig,
    })
    const style = wrapper.find('video').attributes('style') || ''
    expect(style).toContain('width: 320px')
    expect(style).toContain('height: 240px')
  })
})
