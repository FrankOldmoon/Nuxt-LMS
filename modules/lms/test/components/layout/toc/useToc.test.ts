/**
 * useToc 下载菜单项测试
 * @see modules/lms/components/layout/toc/useToc.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])

  ;(globalThis as any).useAuthLms = () => ({
    user: ref(null),
    roles: ref([]),
    permissions: ref([]),
    editorCourseIds: ref([]),
    teacherCourseIds: ref([]),
    isCourseEditor: () => false,
    isCourseTeacher: () => false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })

  ;(globalThis as any).useChapterBtns = () => ({
    playFullscreen: ref(false),
    togglePlay: vi.fn(),
    exitPlay: vi.fn(),
  })

  ;(globalThis as any).useLmsPublicConfig = () => ({
    chapterPage: { enableFullscreen: true },
  })

  ;(globalThis as any).useChapterTask = () => null
})

describe('useToc downloadItems', () => {
  it('包含 PPT/PDF/Word/Markdown 及 JSON（admin 可见）', async () => {
    const { useToc } = await import('../../../../components/layout/toc/useToc')
    const toc = useToc()
    const labels = toc.downloadItems.value[0].map((i: any) => i.label)
    expect(labels).toContain('chapter.exportPpt')
    expect(labels).toContain('chapter.exportPdf')
    expect(labels).toContain('chapter.exportWord')
    expect(labels).toContain('chapter.exportMarkdown')
    expect(labels).toContain('chapter.exportJson')
  })
})
