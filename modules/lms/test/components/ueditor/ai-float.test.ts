// ueditor/ai-float.vue component tests
// @see modules/lms/components/ueditor/ai-float.vue
//
// AI generation floating panel: visible only for teacher/admin when not readonly.
// Uses useAiFloat composable for state management and LLM streaming.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalConfig = {
  mocks: { $t: (k: string) => k, $i18n: { t: (k: string) => k, locale: { value: 'en' } } },
  stubs: {
    UButton: true,
    UTextarea: true,
    UIcon: true,
  },
}

describe('ueditor/ai-float.vue', () => {
  it('is not visible when user has no teacher/admin role', async () => {
    const { default: AiFloat } = await import('../../../components/ueditor/ai-float.vue')
    const wrapper = mount(AiFloat, {
      props: { editor: null, readonly: false, canInsertQuestion: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('is visible when user has teacher role and editor is not readonly', async () => {
    setMockAuthUser({ id: 1, name: 'Teacher' }, [{ code: 'teacher' }])
    const { default: AiFloat } = await import('../../../components/ueditor/ai-float.vue')
    const wrapper = mount(AiFloat, {
      props: { editor: null, readonly: false, canInsertQuestion: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.fixed').exists()).toBe(true)
  })

  it('is not visible when editor is readonly (even for teacher)', async () => {
    setMockAuthUser({ id: 1, name: 'Teacher' }, [{ code: 'teacher' }])
    const { default: AiFloat } = await import('../../../components/ueditor/ai-float.vue')
    const wrapper = mount(AiFloat, {
      props: { editor: null, readonly: true, canInsertQuestion: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('is visible when user has admin role', async () => {
    setMockAuthUser({ id: 1, name: 'Admin' }, [{ code: 'admin' }])
    const { default: AiFloat } = await import('../../../components/ueditor/ai-float.vue')
    const wrapper = mount(AiFloat, {
      props: { editor: null, readonly: false, canInsertQuestion: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.fixed').exists()).toBe(true)
  })
})
