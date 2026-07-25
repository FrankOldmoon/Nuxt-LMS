/**
 * utils/fileUtils 单元测试
 * @see modules/base/utils/fileUtils.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/fileUtils - formatBytes', () => {
  it('空值/负值返回 "0 B"', async () => {
    const { formatBytes } = await import('../../utils/fileUtils')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(undefined as any)).toBe('0 B')
  })

  it('小于 1KB 返回 B', async () => {
    const { formatBytes } = await import('../../utils/fileUtils')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1)).toBe('1 B')
  })

  it('小于 1MB 返回 KB', async () => {
    const { formatBytes } = await import('../../utils/fileUtils')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('小于 1GB 返回 MB', async () => {
    const { formatBytes } = await import('../../utils/fileUtils')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB')
  })

  it('大于等于 1GB 返回 GB', async () => {
    const { formatBytes } = await import('../../utils/fileUtils')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
  })
})

describe('utils/fileUtils - formatFileDate', () => {
  it('空值返回空字符串', async () => {
    const { formatFileDate } = await import('../../utils/fileUtils')
    expect(formatFileDate('')).toBe('')
    expect(formatFileDate(null)).toBe('')
    expect(formatFileDate(undefined)).toBe('')
  })

  it('合法日期返回本地化字符串', async () => {
    const { formatFileDate } = await import('../../utils/fileUtils')
    const result = formatFileDate('2024-06-15T10:30:00')
    expect(result).toMatch(/2024/)
    expect(result.length).toBeGreaterThan(5)
  })
})

describe('utils/fileUtils - fileIcon', () => {
  it('图片文件返回 image 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.jpg', type: 'image/jpeg' })).toBe('i-lucide-image')
    expect(fileIcon({ name: 'a.PNG', type: '' })).toBe('i-lucide-image')
    expect(fileIcon({ name: 'a.svg', type: 'image/svg+xml' })).toBe('i-lucide-image')
  })

  it('视频文件返回 video 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.mp4', type: 'video/mp4' })).toBe('i-lucide-video')
    expect(fileIcon({ name: 'a.webm', type: '' })).toBe('i-lucide-video')
  })

  it('音频文件返回 music 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.mp3', type: 'audio/mpeg' })).toBe('i-lucide-music')
    expect(fileIcon({ name: 'a.wav', type: '' })).toBe('i-lucide-music')
  })

  it('文本文件返回 file-text 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.txt', type: 'text/plain' })).toBe('i-lucide-file-text')
    expect(fileIcon({ name: 'a.md', type: '' })).toBe('i-lucide-file-text')
  })

  it('PDF 文件返回 file 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'doc.pdf', type: '' })).toBe('i-lucide-file')
  })

  it('压缩文件返回 file-archive 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.zip', type: '' })).toBe('i-lucide-file-archive')
    expect(fileIcon({ name: 'a.7z', type: '' })).toBe('i-lucide-file-archive')
  })

  it('Excel 文件返回 file-spreadsheet 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.xlsx', type: '' })).toBe('i-lucide-file-spreadsheet')
    expect(fileIcon({ name: 'a.csv', type: '' })).toBe('i-lucide-file-spreadsheet')
  })

  it('Word 文件返回 file-text 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.docx', type: '' })).toBe('i-lucide-file-text')
  })

  it('未知类型返回默认 file 图标', async () => {
    const { fileIcon } = await import('../../utils/fileUtils')
    expect(fileIcon({ name: 'a.xyz', type: '' })).toBe('i-lucide-file')
    expect(fileIcon({ name: '', type: '' })).toBe('i-lucide-file')
  })
})

describe('utils/fileUtils - isImageFile', () => {
  it('图片类型返回 true', async () => {
    const { isImageFile } = await import('../../utils/fileUtils')
    expect(isImageFile({ name: 'a.jpg', type: 'image/jpeg' })).toBe(true)
    expect(isImageFile({ name: 'a.PNG', type: '' })).toBe(true)
    expect(isImageFile({ name: 'a.gif', type: '' })).toBe(true)
  })

  it('非图片类型返回 false', async () => {
    const { isImageFile } = await import('../../utils/fileUtils')
    expect(isImageFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(false)
    expect(isImageFile({ name: 'a.txt', type: 'text/plain' })).toBe(false)
  })
})

describe('utils/fileUtils - fileUrl', () => {
  it('生成 serve URL 并编码 path', async () => {
    const { fileUrl } = await import('../../utils/fileUtils')
    expect(fileUrl({ path: 'uploads/a.jpg' })).toBe('/api/files/serve?pathname=uploads%2Fa.jpg')
  })

  it('去掉前导斜杠', async () => {
    const { fileUrl } = await import('../../utils/fileUtils')
    expect(fileUrl({ path: '/uploads/a.jpg' })).toBe('/api/files/serve?pathname=uploads%2Fa.jpg')
    expect(fileUrl({ path: '///uploads/a.jpg' })).toBe('/api/files/serve?pathname=uploads%2Fa.jpg')
  })
})

describe('utils/fileUtils - buildFileData', () => {
  it('构建包含 url 的文件数据对象', async () => {
    const { buildFileData } = await import('../../utils/fileUtils')
    const result = buildFileData({ id: 1, name: 'a.jpg', size: 100, type: 'image/jpeg', path: 'uploads/a.jpg' })
    expect(result).toEqual({
      id: 1,
      name: 'a.jpg',
      size: 100,
      type: 'image/jpeg',
      path: 'uploads/a.jpg',
      url: '/api/files/serve?pathname=uploads%2Fa.jpg',
    })
  })
})
