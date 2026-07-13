// ueditor/ws.vue component tests
// @see modules/lms/components/ueditor/ws.vue
//
// WebSocket lock component: empty template, manages edit lock via WS.
// Exposes isLockedByOther ref. Connects on mount if lockId is provided.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {},
}

describe('ueditor/ws.vue', () => {
  it('mounts without error with no lockId (empty template)', async () => {
    const { default: Ws } = await import('../../../components/ueditor/ws.vue')
    const wrapper = mount(Ws, {
      props: {},
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toBe('')
  })

  it('exposes isLockedByOther ref (initially false)', async () => {
    const { default: Ws } = await import('../../../components/ueditor/ws.vue')
    const wrapper = mount(Ws, {
      props: {},
      global: _globalConfig,
    })
    expect(wrapper.vm.isLockedByOther).toBe(false)
  })

  it('accepts a lockId prop without crashing', async () => {
    const { default: Ws } = await import('../../../components/ueditor/ws.vue')
    const wrapper = mount(Ws, {
      props: { lockId: 'test-lock-123' },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
