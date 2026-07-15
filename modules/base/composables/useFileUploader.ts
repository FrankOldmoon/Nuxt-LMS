/**
 * File upload: file list management + v-model sync
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
    const fileItem = {
      name: file.name,
      size: file.size,
      status: 'uploading',
      url: '',
    }
    fileList.value.push(fileItem)

    try {
      const formData = new FormData()
      formData.append('files', file)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        fileItem.status = 'success'
        fileItem.url = result.data.url
        updateModelValue()
      } else {
        fileItem.status = 'error'
        console.error('Upload failed:', result.message)
      }
    } catch (error) {
      fileItem.status = 'error'
      console.error('Upload error:', error)
    }
  }

  function addUrl(url: string) {
    const name = url.split('/').pop()?.split('?')[0] || 'file'
    fileList.value.push({
      name: decodeURIComponent(name),
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
