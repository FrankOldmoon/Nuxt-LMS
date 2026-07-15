/**
 * ueditor/render/nodes/details.vue component test
 * @see modules/lms/components/ueditor/render/nodes/details.vue
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

describe('ueditor/render/nodes/details.vue', () => {
  it('renders details container with toggle button', async () => {
    const { default: DetailsView } = await import('../../../../../components/ueditor/render/nodes/details.vue')
    const wrapper = mount(DetailsView, {
      props: {
        node: {
          type: 'details',
          attrs: { open: false },
          content: [
            { type: 'detailsSummary', content: [{ type: 'text', text: 'Summary' }] },
            { type: 'detailsContent', content: [{ type: 'text', text: 'Body' }] },
          ],
        },
      },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-details').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.html()).toContain('Summary')
  })

  it('has is-open class when open=true', async () => {
    const { default: DetailsView } = await import('../../../../../components/ueditor/render/nodes/details.vue')
    const wrapper = mount(DetailsView, {
      props: { node: { type: 'details', attrs: { open: true }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-details.is-open').exists()).toBe(true)
  })

  it('toggles open state on button click', async () => {
    const { default: DetailsView } = await import('../../../../../components/ueditor/render/nodes/details.vue')
    const wrapper = mount(DetailsView, {
      props: { node: { type: 'details', attrs: { open: false }, content: [] } },
      global: _globalConfig,
    })
    expect(wrapper.find('.umo-node-details.is-open').exists()).toBe(false)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.umo-node-details.is-open').exists()).toBe(true)
  })
})
