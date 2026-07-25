/**
 * useNavEditor composable 测试
 * @see modules/lms/composables/useNavEditor.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useNavEditor', () => {
  it('maxDepth 为 1（category 模式）', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { maxDepth } = useNavEditor({ mode: 'category', navigation: [] }, () => {})
    expect(maxDepth.value).toBe(1)
  })

  it('maxDepth 为 2（course 模式）', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { maxDepth } = useNavEditor({ mode: 'course', courseId: '1', navigation: [] }, () => {})
    expect(maxDepth.value).toBe(2)
  })

  it('初始 open 为 false', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { open } = useNavEditor({ mode: 'category', navigation: [] }, () => {})
    expect(open.value).toBe(false)
  })

  it('openModal 打开弹窗', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { open, openModal } = useNavEditor({ mode: 'category', navigation: [] }, () => {})
    openModal()
    expect(open.value).toBe(true)
  })

  it('cancel 关闭弹窗', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { open, openModal, cancel } = useNavEditor({ mode: 'category', navigation: [] }, () => {})
    openModal()
    cancel()
    expect(open.value).toBe(false)
  })

  it('doBatchImport 解析缩进文本', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { flatItems, importOpen, importText, doBatchImport } = useNavEditor({ mode: 'course', courseId: '1', navigation: [] }, () => {})
    importOpen.value = true
    importText.value = 'Item A\n  Item A.1\nItem B'
    doBatchImport()
    expect(flatItems.value.length).toBeGreaterThanOrEqual(2)
    // 新增的 item 应包含 Item A 和 Item B
    const labels = flatItems.value.map(i => i.label)
    expect(labels).toContain('Item A')
    expect(labels).toContain('Item B')
  })

  it('doBatchImport 空文本不添加', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { flatItems, importText, doBatchImport } = useNavEditor({ mode: 'course', courseId: '1', navigation: [] }, () => {})
    importText.value = ''
    const before = flatItems.value.length
    doBatchImport()
    expect(flatItems.value.length).toBe(before)
  })

  it('resetFromProps 从 navigation 初始化', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const nav = [
      { label: 'Home', to: '/course/1' },
      { label: 'Ch1', to: '/course/1/2' },
    ]
    const { flatItems, resetFromProps } = useNavEditor({ mode: 'course', courseId: '1', navigation: nav }, () => {})
    resetFromProps()
    expect(flatItems.value.length).toBe(2)
    expect(flatItems.value[0].label).toBe('Home')
    expect(flatItems.value[1].label).toBe('Ch1')
  })

  it('saveCourseMode 保存新章节', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/chapters/add' && opts.method === 'POST') {
        return { data: [{ id: 100 }], success: true, msg: '' }
      }
      if (url === '/api/courses/update' && opts.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useNavEditor } = await import('../../composables/useNavEditor')
    let savedEmitted = false
    const { save, openModal, flatItems } = useNavEditor({ mode: 'course', courseId: '1', navigation: [] }, () => { savedEmitted = true })
    openModal()
    await nextTick()
    // 添加一个新章节
    flatItems.value.push({
      _key: 'k-0', id: 'new-1', label: 'New Chapter', to: '', depth: 0, isNew: true,
    })
    await save()
    expect(savedEmitted).toBe(true)
    // openModal 后 watch 会插入默认 course home（id='course'），新章节在 index 1
    const newChapter = flatItems.value.find((i: any) => i.label === 'New Chapter')
    expect(newChapter).toBeTruthy()
    expect(newChapter!.isNew).toBe(false)
    expect(newChapter!.id).toBe('100')
  })

  it('saveCategoryMode 保存新分类和课程', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url === '/api/categories/add') {
        return { data: [{ id: 50 }], success: true, msg: '' }
      }
      if (url === '/api/courses/add') {
        return { data: [{ id: 60 }], success: true, msg: '' }
      }
      if (url === '/api/categories/update') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useNavEditor } = await import('../../composables/useNavEditor')
    let savedEmitted = false
    const { save, openModal, flatItems } = useNavEditor({ mode: 'category', navigation: [] }, () => { savedEmitted = true })
    openModal()
    await nextTick()
    // 添加分类和课程
    flatItems.value.push(
      { _key: 'k-0', id: 'new-1', label: 'New Cat', to: '', depth: 0, isNew: true },
      { _key: 'k-1', id: 'new-2', label: 'New Course', to: '', depth: 1, isNew: true },
    )
    await save()
    expect(savedEmitted).toBe(true)
    expect(flatItems.value[0].id).toBe('50')
    expect(flatItems.value[1].id).toBe('60')
  })

  it('genKey 返回递增 key', async () => {
    const { useNavEditor } = await import('../../composables/useNavEditor')
    const { genKey } = useNavEditor({ mode: 'category', navigation: [] }, () => {})
    const k1 = genKey()
    const k2 = genKey()
    expect(k2).toBe(k1 + 1)
  })
})
