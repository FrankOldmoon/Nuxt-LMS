import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

/**
 * 图片裁剪弹窗：设置图片 + 裁剪 + 上传
 */
export function useImageCropper(
  aspectRatio: () => number | null | undefined,
  stencilType: () => 'circle' | 'rectangle' | undefined,
  onUploaded: (url: string) => void,
) {
  const internalOpen = ref(false)
  const imageSrc = ref<string | null>(null)
  const originalFile = ref<File | null>(null)
  const uploading = ref(false)
  const cropperRef = ref<any>(null)

  const stencil = computed(() =>
    stencilType() === 'circle' ? CircleStencil : RectangleStencil,
  )
  const stencilProps = computed(() => {
    if (aspectRatio()) return { aspectRatio: aspectRatio() }
    return {}
  })

  function setImage(file: File) {
    originalFile.value = file
    imageSrc.value = URL.createObjectURL(file)
    internalOpen.value = true
  }

  function close() {
    internalOpen.value = false
    if (imageSrc.value) {
      URL.revokeObjectURL(imageSrc.value)
      imageSrc.value = null
      originalFile.value = null
    }
  }

  async function handleCrop() {
    if (!cropperRef.value || !originalFile.value) return

    uploading.value = true
    try {
      const { canvas } = cropperRef.value.getResult()

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.8)
      })

      const webpName = originalFile.value.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
      const croppedFile = new File([blob], webpName, { type: 'image/webp' })

      const formData = new FormData()
      formData.append('files', croppedFile)
      const res = await $fetch<{ data: { url: string }; success: boolean; msg: string }>('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.success) {
        throw new Error(res.msg || '上传失败')
      }

      onUploaded(res.data.url)
      close()
    } catch (e: any) {
      useToast().add({ title: e.message || '裁剪上传失败', color: 'error' })
    } finally {
      uploading.value = false
    }
  }

  return {
    Cropper,
    internalOpen, imageSrc, cropperRef, uploading,
    stencil, stencilProps,
    setImage, close, handleCrop,
  }
}
