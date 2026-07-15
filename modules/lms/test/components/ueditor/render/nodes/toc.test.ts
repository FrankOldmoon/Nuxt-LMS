/**
 * ueditor/render/nodes/toc.vue component test
 * @see modules/lms/components/ueditor/render/nodes/toc.vue
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

describe('ueditor/render/nodes/toc.vue', () => {
  it('renders TOC heading and empty body', async () => {
    const { default: TocView } = await import('../../../../../components/ueditor/render/nodes/toc.vue')
    const wrapper = mount(TocView, { props: { node: { type: 'toc' } }, global: _globalConfig })
    expect(wrapper.find('.umo-node-toc').exists()).toBe(true)
    expect(wrapper.text()).toContain('ueditor.toc.heading')
    expect(wrapper.text()).toContain('ueditor.toc.empty')
  })
})
