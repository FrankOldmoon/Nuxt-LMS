/** File size formatting */
export function formatBytes(n: number): string {
  if (!n || n < 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Localize file timestamp (includes time part, unlike formatDate in format.ts which is date-only) */
export function formatFileDate(d: any): string {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

/** Infer lucide icon based on file name/type */
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

/** Determine if the file is an image */
export function isImageFile(f: any): boolean {
  const name = (f.name || '').toLowerCase()
  const type = f.type || ''
  return type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)
}

/** Get file access URL */
export function fileUrl(f: any): string {
  return `/api/files/serve?pathname=${encodeURIComponent(f.path.replace(/^\/+/, ''))}`
}

/** Build external file data (selector mode) */
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
