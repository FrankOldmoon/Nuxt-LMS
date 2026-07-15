/**
 * chapter/danmaku/modal.vue component test
 * @see modules/lms/components/chapter/danmaku/modal.vue
 *
 * Modal: teacher can toggle danmaku switch, send danmaku; students can only send when danmaku is enabled.
 * Depends on useAuth/useWebSocket/useLayoutState, stubbed in tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function setupStubs(opts: { canEdit?: boolean; showDanmaku?: boolean } = {}) {
  const sendDanmaku = vi.fn()
  const showDanmakuRef = ref(opts.showDanmaku ?? true)
  ;(globalThis as any).useWebSocket = () => ({ sendDanmaku })
  ;(globalThis as any).useLayoutState = () => ({
    showDanmaku: showDanmakuRef,
    notifyCourseNavUpdate: vi.fn(),
  })
  if (opts.canEdit) {
    setMockAuthUser({ id: 1, name: 'teacher' }, [{ code: 'teacher' }], [])
  } else {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student' }], [])
  }
  return { sendDanmaku, showDanmakuRef }
}

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup.enter\', $event)" />',
    props: ['modelValue', 'placeholder', 'maxlength'],
  },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['label', 'color', 'size', 'icon', 'disabled', 'loading', 'variant'],
  },
  USwitch: {
    template: '<input type="checkbox" class="uswitch" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/danmaku/modal.vue', () => {
  it('open=true canEdit=true 时渲染弹幕开关 + 发送区', async () => {
    setupStubs({ canEdit: true, showDanmaku: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.find('.uswitch').exists()).toBe(true)
    expect(wrapper.find('input[type="text"], input:not([type])').exists()).toBe(true)
  })

  it('canEdit=false 且 showDanmaku=true 时渲染发送区（无开关）', async () => {
    setupStubs({ canEdit: false, showDanmaku: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.uswitch').exists()).toBe(false)
    // Send area still renders
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('canEdit=false 且 showDanmaku=false 时显示"弹幕已关闭"', async () => {
    setupStubs({ canEdit: false, showDanmaku: false })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('chapter.danmakuDisabled')
  })

  it('输入弹幕后点击发送调用 wsSendDanmaku 并关闭弹窗', async () => {
    const { sendDanmaku } = setupStubs({ canEdit: false, showDanmaku: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 5, canEdit: false },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('你好弹幕')
    await wrapper.find('button').trigger('click')
    expect(sendDanmaku).toHaveBeenCalledWith(5, '你好弹幕', 'student')
    // After sending, open becomes false
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('空文本不发送', async () => {
    const { sendDanmaku } = setupStubs({ canEdit: false, showDanmaku: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 5, canEdit: false },
      global: _globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(sendDanmaku).not.toHaveBeenCalled()
  })

  it('classId=0 时不发送', async () => {
    const { sendDanmaku } = setupStubs({ canEdit: false, showDanmaku: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 0, canEdit: false },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('测试')
    await wrapper.find('button').trigger('click')
    expect(sendDanmaku).not.toHaveBeenCalled()
  })
})
