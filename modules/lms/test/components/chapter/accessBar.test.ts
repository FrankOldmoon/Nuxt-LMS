/**
 * chapter/accessBar.vue 组件测试
 * @see modules/lms/components/chapter/accessBar.vue
 *
 * 章节访问控制条：开放开关 + 班级多选。canEdit=true 时渲染。
 * 逻辑由 useChapterAccess() 提供，测试中导入真实 composable + 依赖 useAuthLms/useClasses。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n, setMockAuthUser, setMockFetchHandler } from '../../../../../test/setup/nuxt-stubs'
import { useChapterAccess } from '../../../composables/useChapterAccess'
import { useAuthLms } from '../../../composables/useAuthLms'
import { useClasses } from '../../../../base/composables/useClasses'

;(globalThis as any).useChapterAccess = useChapterAccess
;(globalThis as any).useAuthLms = useAuthLms
;(globalThis as any).useClasses = useClasses

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  USwitch: {
    template: '<input type="checkbox" class="uswitch" :checked="modelValue" :disabled="loading" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'loading'],
  },
  USelect: {
    template: '<select class="uselect" multiple><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'multiple', 'size'],
  },
  USeparator: { template: '<div class="useparator" />', props: ['orientation'] },
  UButton: { template: '<button class="ubtn" @click="$emit(\'click\')">{{ label }}<slot /></button>', props: ['icon', 'label', 'color', 'variant', 'size'] },
  ChapterClassOpenMatrixModal: { template: '<div class="matrix-modal" />', props: ['open', 'uuid'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('chapter/accessBar.vue', () => {
  it('admin 用户 canEdit=true 时渲染访问控制条', async () => {
    setMockAuthUser({ id: 1, name: 'admin', username: 'admin' }, [{ code: 'admin' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: true, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.uswitch').exists()).toBe(true)
  })

  it('非教师/管理员 canEdit=false 时不渲染', async () => {
    setMockAuthUser({ id: 2, name: 'student', username: 'student' }, [{ code: 'student' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: true } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.uswitch').exists()).toBe(false)
  })

  it('教师（teacherCourseIds 含 courseId）canEdit=true', async () => {
    setMockAuthUser(
      { id: 3, name: 'teacher', username: 'teacher' },
      [{ code: 'teacher' }],
      [],
      { teacherCourseIds: [1] },
    )
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: false } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.uswitch').exists()).toBe(true)
  })

  it('chapterData.isOpen=true 时开关默认开启', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: true, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect((wrapper.find('.uswitch').element as HTMLInputElement).checked).toBe(true)
  })

  it('chapterData.isOpen=false 时开关默认关闭', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: false, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect((wrapper.find('.uswitch').element as HTMLInputElement).checked).toBe(false)
  })

  it('渲染班级多选下拉', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: true, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.uselect').exists()).toBe(true)
  })

  it('管理员显示「班级开放矩阵」按钮', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin' }], [])
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: true, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('chapter.classOpenMatrix')
  })

  it('非管理员（即使是教师）不显示「班级开放矩阵」按钮', async () => {
    setMockAuthUser(
      { id: 3, name: 'teacher', username: 'teacher' },
      [{ code: 'teacher' }],
      [],
      { teacherCourseIds: [1] },
    )
    const { default: AccessBar } = await import('../../../components/chapter/accessBar.vue')
    const wrapper = mount(AccessBar, {
      props: { chapterId: 10, courseId: 1, chapterData: { isOpen: false, classChapters: [] } },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).not.toContain('chapter.classOpenMatrix')
  })
})
