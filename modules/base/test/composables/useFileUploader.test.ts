/**
 * composables/useFileUploader 测试
 * @see modules/base/composables/useFileUploader.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  ;(globalThis as any).fetch = vi.fn()
})

describe('composables/useFileUploader - fileList & addUrl', () => {
  it('初始 fileList 为空', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList } = useFileUploader(() => false, () => {})
    expect(fileList.value).toEqual([])
  })

  it('addUrl 添加文件并触发 onUpdate（单选返回 string）', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const calls: any[] = []
    const { fileList, addUrl } = useFileUploader(() => false, (val) => calls.push(val))
    addUrl('https://example.com/files/a.jpg')
    expect(fileList.value).toHaveLength(1)
    expect(fileList.value[0].name).toBe('a.jpg')
    expect(fileList.value[0].status).toBe('success')
    expect(fileList.value[0].url).toBe('https://example.com/files/a.jpg')
    expect(calls).toEqual(['https://example.com/files/a.jpg'])
  })

  it('多选模式 onUpdate 收到数组', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const calls: any[] = []
    const { addUrl } = useFileUploader(() => true, (val) => calls.push(val))
    addUrl('https://example.com/a.jpg')
    addUrl('https://example.com/b.png')
    expect(calls).toEqual([['https://example.com/a.jpg'], ['https://example.com/a.jpg', 'https://example.com/b.png']])
  })

  it('addUrl 解析带 query string 的 URL 文件名', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList, addUrl } = useFileUploader(() => false, () => {})
    addUrl('https://example.com/path/file%20name.doc?token=abc')
    expect(fileList.value[0].name).toBe('file name.doc')
  })

  it('addUrl 对无扩展名的 URL 使用默认文件名', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList, addUrl } = useFileUploader(() => false, () => {})
    addUrl('https://example.com/path/')
    expect(fileList.value[0].name).toBe('file')
  })

  it('addUrl 从 /api/files/serve?pathname= 解析真实文件名', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList, addUrl } = useFileUploader(() => false, () => {})
    addUrl('/api/files/serve?pathname=221%2F2.md')
    expect(fileList.value[0].name).toBe('2.md')
  })
})

describe('composables/useFileUploader - removeFile', () => {
  it('removeFile 按索引删除并触发 onUpdate', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const calls: any[] = []
    const { fileList, addUrl, removeFile } = useFileUploader(() => true, (val) => calls.push(val))
    addUrl('https://example.com/a.jpg')
    addUrl('https://example.com/b.png')
    removeFile(0)
    expect(fileList.value).toHaveLength(1)
    expect(fileList.value[0].url).toBe('https://example.com/b.png')
    expect(calls[calls.length - 1]).toEqual(['https://example.com/b.png'])
  })
})

describe('composables/useFileUploader - onDriveConfirm', () => {
  it('添加多个从 drive 选中的文件并触发 onUpdate', async () => {
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const calls: any[] = []
    const { fileList, onDriveConfirm } = useFileUploader(() => true, (val) => calls.push(val))
    onDriveConfirm([
      { name: 'a.jpg', size: 100, url: 'https://example.com/a.jpg' },
      { name: 'b.png', size: 200, url: 'https://example.com/b.png' },
    ])
    expect(fileList.value).toHaveLength(2)
    expect(calls[0]).toEqual(['https://example.com/a.jpg', 'https://example.com/b.png'])
  })
})

describe('composables/useFileUploader - uploadFiles', () => {
  it('上传成功后更新文件状态和 url', async () => {
    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: { url: 'https://cdn.com/x.jpg' } }),
    })
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const calls: any[] = []
    const { fileList, uploadFiles } = useFileUploader(() => false, (val) => calls.push(val))
    const file = new File(['data'], 'pic.jpg', { type: 'image/jpeg' })
    await uploadFiles([file])
    expect(fileList.value).toHaveLength(1)
    expect(fileList.value[0].status).toBe('success')
    expect(fileList.value[0].url).toBe('https://cdn.com/x.jpg')
    expect(calls).toEqual(['https://cdn.com/x.jpg'])
  })

  it('上传失败时设置 status=error', async () => {
    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, message: 'too large' }),
    })
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList, uploadFiles } = useFileUploader(() => false, () => {})
    const file = new File(['data'], 'big.zip', { type: 'application/zip' })
    await uploadFiles([file])
    expect(fileList.value[0].status).toBe('error')
  })

  it('fetch 抛错时设置 status=error', async () => {
    ;(globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('network'))
    const { useFileUploader } = await import('../../composables/useFileUploader')
    const { fileList, uploadFiles } = useFileUploader(() => false, () => {})
    await uploadFiles([new File(['x'], 'a.jpg')])
    expect(fileList.value[0].status).toBe('error')
  })
})

describe('composables/useFileUploader - getFileIcon', () => {
  it('返回对应扩展名的图标', async () => {
    const { getFileIcon } = await import('../../composables/useFileUploader')
    expect(getFileIcon('a.pdf')).toBe('i-heroicons-document-text')
    expect(getFileIcon('a.docx')).toBe('i-heroicons-document')
    expect(getFileIcon('a.xlsx')).toBe('i-heroicons-table-cells')
    expect(getFileIcon('a.pptx')).toBe('i-heroicons-presentation-chart-bar')
    expect(getFileIcon('a.png')).toBe('i-heroicons-photo')
    expect(getFileIcon('a.mp4')).toBe('i-heroicons-video-camera')
    expect(getFileIcon('a.mp3')).toBe('i-heroicons-musical-note')
    expect(getFileIcon('a.zip')).toBe('i-heroicons-archive-box')
  })

  it('未知扩展名返回默认图标', async () => {
    const { getFileIcon } = await import('../../composables/useFileUploader')
    expect(getFileIcon('a.unknown')).toBe('i-heroicons-document')
    expect(getFileIcon('noext')).toBe('i-heroicons-document')
  })

  it('扩展名大小写不敏感', async () => {
    const { getFileIcon } = await import('../../composables/useFileUploader')
    expect(getFileIcon('A.PDF')).toBe('i-heroicons-document-text')
  })
})
