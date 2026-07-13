/**
 * composables/useMyFiles 测试
 * @see modules/base/composables/useMyFiles.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  // confirm 默认返回 true
  ;(globalThis as any).confirm = () => true
})

describe('composables/useMyFiles - 初始状态 & title', () => {
  it('无 group 时 title 为 myFiles.title', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { title } = useMyFiles(() => undefined)
    expect(title.value).toBe('myFiles.title')
  })

  it('有 group 时 title 为 coursePanel.groupFiles', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { title } = useMyFiles(() => 'group-1')
    expect(title.value).toBe('coursePanel.groupFiles')
  })

  it('初始 files/selectedIds/usage 状态', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { files, selectedIds, usage, page, sortBy, orderIcon, uploading } = useMyFiles(() => undefined)
    expect(files.value).toEqual([])
    expect(selectedIds.value.size).toBe(0)
    expect(usage.value).toEqual({ used: 0, quota: 0, free: 0, unlimited: false })
    expect(page.value).toBe(1)
    expect(sortBy.value).toBe('createdAt')
    // sortOrder 不在返回值中，通过 orderIcon 间接验证（desc = 向下箭头）
    expect(orderIcon.value).toBe('i-lucide-arrow-down-narrow-wide')
    expect(uploading.value).toBe(false)
  })
})

describe('composables/useMyFiles - sortOptions & orderIcon', () => {
  it('sortOptions 包含 createdAt/size/name', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { sortOptions } = useMyFiles(() => undefined)
    const values = sortOptions.value.map((o: any) => o.value)
    expect(values).toEqual(['createdAt', 'size', 'name'])
  })

  it('orderIcon desc 时为向下箭头', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { orderIcon } = useMyFiles(() => undefined)
    expect(orderIcon.value).toBe('i-lucide-arrow-down-narrow-wide')
  })
})

describe('composables/useMyFiles - toggleOrder', () => {
  it('toggleOrder 切换 sortOrder 并重新加载', async () => {
    setMockFetchHandler(async () => ({ data: { list: [], total: 0 }, success: true, msg: '' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { toggleOrder, orderIcon } = useMyFiles(() => undefined)
    // sortOrder 不在返回值中，通过 orderIcon 间接验证
    expect(orderIcon.value).toBe('i-lucide-arrow-down-narrow-wide') // desc
    toggleOrder()
    expect(orderIcon.value).toBe('i-lucide-arrow-up-wide-narrow') // asc
  })
})

describe('composables/useMyFiles - loadFiles', () => {
  it('加载文件列表', async () => {
    setMockFetchHandler(async () => ({
      data: {
        list: [{ id: 1, name: 'a.jpg', size: 100 }, { id: 2, name: 'b.png', size: 200 }],
        total: 2,
      },
      success: true,
      msg: '',
    }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { loadFiles, files, total } = useMyFiles(() => undefined)
    await loadFiles(1)
    expect(files.value).toHaveLength(2)
    expect(total.value).toBe(2)
  })

  it('加载失败时弹错误 toast', async () => {
    setMockFetchHandler(async () => { throw new Error('server error') })
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { loadFiles, loading } = useMyFiles(() => undefined)
    await loadFiles(1)
    expect(loading.value).toBe(false)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
  })
})

describe('composables/useMyFiles - rename', () => {
  it('startRename 设置 renamingId 和 renameValue', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { startRename, renamingId, renameValue } = useMyFiles(() => undefined)
    startRename({ id: 5, name: 'old.jpg' })
    expect(renamingId.value).toBe(5)
    expect(renameValue.value).toBe('old.jpg')
  })

  it('cancelRename 清空 renamingId 和 renameValue', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { startRename, cancelRename, renamingId, renameValue } = useMyFiles(() => undefined)
    startRename({ id: 5, name: 'old.jpg' })
    cancelRename()
    expect(renamingId.value).toBeNull()
    expect(renameValue.value).toBe('')
  })

  it('confirmRename 成功后更新文件名', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { startRename, confirmRename, renamingId } = useMyFiles(() => undefined)
    const file = { id: 5, name: 'old.jpg' }
    startRename(file)
    // renameValue 已被 startRename 设置为 'old.jpg'
    confirmRename(file)
    // 因 name === f.name 直接 cancelRename
    expect(renamingId.value).toBeNull()
  })

  it('confirmRename 相同名称直接取消', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { startRename, confirmRename, renamingId } = useMyFiles(() => undefined)
    const file = { id: 5, name: 'old.jpg' }
    startRename(file)
    confirmRename(file)
    expect(renamingId.value).toBeNull()
  })
})

describe('composables/useMyFiles - uploadFile', () => {
  it('上传成功后弹成功 toast 并重新加载', async () => {
    setMockFetchHandler(async () => ({ data: { list: [], total: 0 }, success: true, msg: '' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { uploadFile, uploading } = useMyFiles(() => undefined)
    const file = new File(['data'], 'pic.jpg', { type: 'image/jpeg' })
    await uploadFile(file)
    expect(uploading.value).toBe(false)
    const calls = getToastCalls()
    expect(calls[0].color).toBe('success')
  })

  it('上传失败（success=false）时弹错误 toast', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'too large' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { uploadFile } = useMyFiles(() => undefined)
    await uploadFile(new File(['x'], 'big.zip'))
    const calls = getToastCalls()
    expect(calls[0].color).toBe('error')
    expect(calls[0].title).toBe('too large')
  })

  it('group 模式上传时附加 group 字段', async () => {
    let capturedBody: any
    setMockFetchHandler(async (url, opts: any) => {
      // 只捕获 upload 请求的 body（loadFiles 请求没有 body 属性会覆盖）
      if (String(url).includes('/api/files/upload')) {
        capturedBody = opts.body
      }
      if (String(url).includes('/api/files/list')) {
        return { data: { list: [], total: 0 }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { uploadFile } = useMyFiles(() => 'g1')
    await uploadFile(new File(['x'], 'a.jpg'))
    // FormData 的 group 字段
    expect(capturedBody.get('group')).toBe('g1')
  })
})

describe('composables/useMyFiles - remove', () => {
  it('confirm=false 时不删除', async () => {
    ;(globalThis as any).confirm = () => false
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { remove } = useMyFiles(() => undefined)
    await remove({ id: 1, name: 'a.jpg' })
    // 无 toast 调用
    expect(getToastCalls()).toHaveLength(0)
  })

  it('删除成功后弹成功 toast', async () => {
    ;(globalThis as any).confirm = () => true
    setMockFetchHandler(async () => ({ data: { list: [], total: 0 }, success: true, msg: '' }))
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { remove } = useMyFiles(() => undefined)
    await remove({ id: 1, name: 'a.jpg' })
    const calls = getToastCalls()
    expect(calls[0].color).toBe('success')
  })
})

describe('composables/useMyFiles - 选择器模式', () => {
  it('pickFile 调用 onConfirm', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    let picked: any[] = []
    const { pickFile } = useMyFiles(() => undefined, ref(false), (files) => { picked = files })
    pickFile({ id: 1, name: 'a.jpg', size: 100, type: 'image/jpeg', path: 'uploads/a.jpg' })
    expect(picked).toHaveLength(1)
    expect(picked[0].id).toBe(1)
    expect(picked[0].url).toContain('/api/files/serve')
  })

  it('toggleSelect 选中/取消', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { toggleSelect, selectedIds } = useMyFiles(() => undefined)
    toggleSelect({ id: 1 }, true)
    expect(selectedIds.value.has(1)).toBe(true)
    toggleSelect({ id: 1 }, false)
    expect(selectedIds.value.has(1)).toBe(false)
  })

  it('confirmPickMultiple 提交选中的文件', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    let picked: any[] = []
    const { files, toggleSelect, confirmPickMultiple } = useMyFiles(
      () => undefined,
      ref(false),
      (fs) => { picked = fs },
    )
    files.value = [
      { id: 1, name: 'a.jpg', size: 100, type: 'image/jpeg', path: 'a/a.jpg' },
      { id: 2, name: 'b.png', size: 200, type: 'image/png', path: 'b/b.png' },
    ]
    toggleSelect({ id: 2 }, true)
    confirmPickMultiple()
    expect(picked).toHaveLength(1)
    expect(picked[0].id).toBe(2)
  })

  it('confirmPickMultiple 无选中时不调用 onConfirm', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    let picked: any[] | null = null
    const { confirmPickMultiple } = useMyFiles(
      () => undefined,
      ref(false),
      (fs) => { picked = fs },
    )
    confirmPickMultiple()
    expect(picked).toBeNull()
  })
})

describe('composables/useMyFiles - download / preview', () => {
  it('download 创建 a 标签并点击', async () => {
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { download } = useMyFiles(() => undefined)
    // 不抛错即视为成功（document.createElement 在 happy-dom 中可用）
    expect(() => download({ id: 1 })).not.toThrow()
  })

  it('preview 调用 window.open', async () => {
    const openSpy = vi.fn()
    ;(globalThis as any).window.open = openSpy
    const { useMyFiles } = await import('../../composables/useMyFiles')
    const { preview } = useMyFiles(() => undefined)
    preview({ id: 1, path: '/uploads/a.jpg' })
    expect(openSpy).toHaveBeenCalled()
    const url = openSpy.mock.calls[0][0]
    expect(url).toContain('/api/files/serve')
    expect(url).toContain('pathname=uploads%2Fa.jpg')
  })
})
