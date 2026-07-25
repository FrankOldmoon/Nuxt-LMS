/**
 * ueditor/render/nodes/page-break.vue 组件测试
 * @see modules/lms/components/ueditor/render/nodes/page-break.vue
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

describe('ueditor/render/nodes/page-break.vue', () => {
  it('renders a page-break div with i18n content', async () => {
    const { default: PageBreak } = await import('../../../../../components/ueditor/render/nodes/page-break.vue')
    const wrapper = mount(PageBreak, { props: { node: { type: 'pageBreak' } }, global: _globalConfig })
    expect(wrapper.find('.umo-page-break').exists()).toBe(true)
    expect(wrapper.html()).toContain('ueditor.pageBreak')
  })
})
