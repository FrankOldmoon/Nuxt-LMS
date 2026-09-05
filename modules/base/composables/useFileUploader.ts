/**
 * 文件上传：file list 管理 + v-model 同步
 */
export function useFileUploader(
  multiple: () => boolean,
  onUpdate: (val: string | string[]) => void,
) {
  const fileList = ref<any[]>([])
  const driveOpen = ref(false)

  async function uploadFiles(files: File[]) {
    const uploadPromises = files.map(file => uploadSingleFile(file))
    await Promise.all(uploadPromises)
  }

  async function uploadSingleFile(file: File) {
    // 图片文件先压缩为 webp（compressImage 对非图片/GIF/SVG 返回原文件）
    const uploadFile = file.type.startsWith('image/') ? await compressImage(file) : file
    const fileItem = reactive({
      name: uploadFile.name,
      size: uploadFile.size,
      status: 'uploading',
      url: '',
    })
    fileList.value.push(fileItem)

    try {
      const formData = new FormData()
      formData.append('files', uploadFile)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        fileItem.status = 'success'
        fileItem.url = result.data.url
        // 用服务端返回的原始文件名与大小覆盖（压缩/重命名后更准确）
        if (result.data?.name) fileItem.name = result.data.name
        if (result.data?.size != null) fileItem.size = Number(result.data.size)
        updateModelValue()
      } else {
        fileItem.status = 'error'
        console.error('上传失败:', result.message)
      }
    } catch (error) {
      fileItem.status = 'error'
      console.error('上传出错:', error)
    }
  }

  function addUrl(url: string) {
    fileList.value.push({
      name: getFileNameFromUrl(url),
      size: 0,
      status: 'success',
      url,
    })
    updateModelValue()
  }

  function onDriveConfirm(selectedFiles: any[]) {
    for (const f of selectedFiles) {
      fileList.value.push({
        name: f.name,
        size: f.size,
        status: 'success',
        url: f.url,
      })
    }
    updateModelValue()
  }

  function removeFile(idx: number) {
    fileList.value.splice(idx, 1)
    updateModelValue()
  }

  function updateModelValue() {
    const urls = fileList.value
      .filter(f => f.status === 'success')
      .map(f => f.url)

    if (multiple()) {
      onUpdate(urls)
    } else {
      onUpdate(urls[0] || '')
    }
  }

  return {
    fileList,
    driveOpen,
    uploadFiles,
    addUrl,
    onDriveConfirm,
    removeFile,
  }
}

const ICON_MAP: Record<string, string> = {
  pdf: 'i-heroicons-document-text',
  doc: 'i-heroicons-document',
  docx: 'i-heroicons-document',
  xls: 'i-heroicons-table-cells',
  xlsx: 'i-heroicons-table-cells',
  ppt: 'i-heroicons-presentation-chart-bar',
  pptx: 'i-heroicons-presentation-chart-bar',
  jpg: 'i-heroicons-photo',
  jpeg: 'i-heroicons-photo',
  png: 'i-heroicons-photo',
  gif: 'i-heroicons-photo',
  mp4: 'i-heroicons-video-camera',
  mp3: 'i-heroicons-musical-note',
  zip: 'i-heroicons-archive-box',
  rar: 'i-heroicons-archive-box',
}

export function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return (ext && ICON_MAP[ext]) || 'i-heroicons-document'
}

/** 从 URL 解析文件名：支持 /api/files/serve?pathname=221%2F2.md 与普通路径 URL */
export function getFileNameFromUrl(url: string): string {
  try {
    const u = new URL(url, 'http://x')
    // 优先用 pathname query 参数（/api/files/serve?pathname=221%2F2.md → 2.md）
    const pathnameParam = u.searchParams.get('pathname')
    if (pathnameParam) {
      return pathnameParam.split('/').pop() || pathnameParam || 'file'
    }
    // 否则取路径最后一段（解码）
    const seg = u.pathname.split('/').pop() || ''
    return seg ? decodeURIComponent(seg) : 'file'
  } catch {
    return url.split('/').pop()?.split('?')[0] || 'file'
  }
}
