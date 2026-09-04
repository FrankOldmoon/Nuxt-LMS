/**
 * chapter/danmaku/modal.vue 组件测试
 * @see modules/lms/components/chapter/danmaku/modal.vue
 *
 * 弹窗：教师可切换"学生能否发送弹幕"（课程级配置）；发送区对教师或允许学生发送时开放。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

function setupStubs(opts: { canEdit?: boolean; courseId?: number; studentCanSend?: boolean } = {}) {
  const sendDanmaku = vi.fn()
  const courseId = opts.courseId ?? 0
  const courseIdRef = ref(courseId)
  ;(globalThis as any).useWebSocket = () => ({ sendDanmaku })
  ;(globalThis as any).useLayoutState = () => ({ notifyCourseNavUpdate: vi.fn() })
  ;(globalThis as any).useLmsContext = () => ({ courseId: courseIdRef, chapterId: ref(0) })
  // 课程配置读取（仅 courseId>0 时触发）
  const cRequest = vi.fn().mockResolvedValue({ studentCanSend: opts.studentCanSend ?? true })
  ;(globalThis as any).cRequest = cRequest
  if (opts.canEdit) {
    setMockAuthUser({ id: 1, name: 'teacher' }, [{ code: 'teacher' }], [])
  } else {
    setMockAuthUser({ id: 2, name: 'student' }, [{ code: 'student' }], [])
  }
  return { sendDanmaku, cRequest, courseIdRef }
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
  it('canEdit=true 时渲染教师开关 + 发送区', async () => {
    setupStubs({ canEdit: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.find('.uswitch').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('canEdit=false 且允许学生发送时渲染发送区（无教师开关）', async () => {
    setupStubs({ canEdit: false, studentCanSend: true })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.uswitch').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('课程禁止学生发送时（studentCanSend=false）学生看不到发送区', async () => {
    setupStubs({ canEdit: false, courseId: 1, studentCanSend: false })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('chapter.danmakuDisabled')
  })

  it('输入弹幕后点击发送携带 courseId + userId 调用 wsSendDanmaku 并关闭弹窗', async () => {
    const { sendDanmaku } = setupStubs({ canEdit: false, courseId: 7 })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 5, canEdit: false },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('你好弹幕')
    await wrapper.find('button').trigger('click')
    expect(sendDanmaku).toHaveBeenCalledWith(5, '你好弹幕', 'student', 7, 2)
    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('教师切换开关保存为课程配置', async () => {
    const { cRequest } = setupStubs({ canEdit: true, courseId: 3 })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 1, canEdit: true },
      global: _globalConfig,
    })
    const sw = wrapper.find('.uswitch')
    await sw.setValue(false)
    expect(cRequest).toHaveBeenCalledWith('/api/lms-config/course', expect.objectContaining({
      method: 'POST',
      body: { course_id: 3, danmaku: { studentCanSend: false } },
    }))
  })

  it('空文本不发送', async () => {
    const { sendDanmaku } = setupStubs({ canEdit: false })
    const { default: DanmakuModal } = await import('../../../../components/chapter/danmaku/modal.vue')
    const wrapper = mount(DanmakuModal, {
      props: { open: true, classId: 5, canEdit: false },
      global: _globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(sendDanmaku).not.toHaveBeenCalled()
  })
})