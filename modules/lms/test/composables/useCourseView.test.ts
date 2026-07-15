/**
 * useCourseView composable test
 * @see modules/lms/composables/useCourseView.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useSiteConfig（auto-imported）
  ;(globalThis as any).useSiteConfig = () => ({
    siteTitle: ref('Test Site'),
  })
})

describe('composables/useCourseView', () => {
  it('初始 teachersModalOpen 为 false', async () => {
    const { useCourseView } = await import('../../composables/useCourseView')
    const props = {
      course: null,
      pending: false,
      canEdit: false,
      hasContent: false,
      chapterTree: [],
      exporting: false,
      canManageTeachers: false,
      courseId: '1',
    }
    const { teachersModalOpen } = useCourseView(props, () => {})
    expect(teachersModalOpen.value).toBe(false)
  })

  it('openTeachersModal 打开弹窗', async () => {
    const { useCourseView } = await import('../../composables/useCourseView')
    const props = {
      course: null,
      pending: false,
      canEdit: false,
      hasContent: false,
      chapterTree: [],
      exporting: false,
      canManageTeachers: false,
      courseId: '1',
    }
    const { teachersModalOpen, openTeachersModal } = useCourseView(props, () => {})
    openTeachersModal()
    expect(teachersModalOpen.value).toBe(true)
  })

  it('closeTeachersModal 关闭弹窗并 emit saved', async () => {
    const { useCourseView } = await import('../../composables/useCourseView')
    const props = {
      course: null,
      pending: false,
      canEdit: false,
      hasContent: false,
      chapterTree: [],
      exporting: false,
      canManageTeachers: false,
      courseId: '1',
    }
    let savedEmitted = false
    const { teachersModalOpen, openTeachersModal, closeTeachersModal } = useCourseView(props, () => { savedEmitted = true })
    openTeachersModal()
    await nextTick()
    closeTeachersModal()
    expect(teachersModalOpen.value).toBe(false)
    // watch(teachersModalOpen) emits saved when val=false (flush:'pre' needs nextTick)
    await vi.waitFor(() => {
      expect(savedEmitted).toBe(true)
    })
  })

  it('membersEl 初始为 null', async () => {
    const { useCourseView } = await import('../../composables/useCourseView')
    const props = {
      course: null,
      pending: false,
      canEdit: false,
      hasContent: false,
      chapterTree: [],
      exporting: false,
      canManageTeachers: false,
      courseId: '1',
    }
    const { membersEl } = useCourseView(props, () => {})
    expect(membersEl.value).toBeNull()
  })
})
