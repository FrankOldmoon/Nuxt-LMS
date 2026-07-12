/** 文件大小格式化 */
export function formatBytes(n: number): string {
  if (!n || n < 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 文件时间戳本地化（含时间部分，区别于 format.ts 的 formatDate 仅日期） */
export function formatFileDate(d: any): string {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

/** 根据文件名/类型推断 lucide 图标 */
export function fileIcon(f: any): string {
  const name = (f.name || '').toLowerCase()
  const type = f.type || ''
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)) return 'i-lucide-image'
  if (type.startsWith('video/') || /\.(mp4|webm|avi|mov)$/.test(name)) return 'i-lucide-video'
  if (type.startsWith('audio/') || /\.(mp3|wav|flac)$/.test(name)) return 'i-lucide-music'
  if (type.startsWith('text/') || /\.(txt|md)$/.test(name)) return 'i-lucide-file-text'
  if (/\.(pdf)$/.test(name)) return 'i-lucide-file'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'i-lucide-file-archive'
  if (/\.(doc|docx)$/.test(name)) return 'i-lucide-file-text'
  if (/\.(xls|xlsx|csv)$/.test(name)) return 'i-lucide-file-spreadsheet'
  if (/\.(ppt|pptx)$/.test(name)) return 'i-lucide-file'
  return 'i-lucide-file'
}

/** 判断文件是否为图片 */
export function isImageFile(f: any): boolean {
  const name = (f.name || '').toLowerCase()
  const type = f.type || ''
  return type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)
}

/** 获取文件访问 URL */
export function fileUrl(f: any): string {
  return `/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`
}

/** 构建可外发的文件数据（选择器模式） */
export function buildFileData(f: any) {
  return {
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    path: f.path,
    url: `/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`,
  }
}
