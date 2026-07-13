/**
 * ueditor/render/nodes/audio.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/audio.vue
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

describe('ueditor/render/nodes/audio.vue', () => {
  it('renders an <audio> with src and controls', async () => {
    const { default: AudioView } = await import('../../../../../components/ueditor/render/nodes/audio.vue')
    const wrapper = mount(AudioView, {
      props: { node: { type: 'audio', attrs: { src: 'https://example.com/a.mp3' } } },
      global: _globalConfig,
    })
    const audio = wrapper.find('audio')
    expect(audio.exists()).toBe(true)
    expect(audio.attributes('src')).toBe('https://example.com/a.mp3')
    expect(audio.attributes('controls')).toBeDefined()
  })
})
