/**
 * 图片压缩工具函数
 * 使用 browser-image-compression 库进行智能压缩
 */
import imageCompression from 'browser-image-compression'

/**
 * 图片压缩配置
 */
export interface CompressOptions {
    maxSizeMB?: number           // 最大文件大小（MB）
    maxWidthOrHeight?: number    // 最大宽高（px）
    quality?: number             // 压缩质量（0-1）
    fileType?: string            // 输出格式
}

const DEFAULT_OPTIONS: CompressOptions = {
    maxSizeMB: 2,
    maxWidthOrHeight: 3840,
    quality: 0.8,
    fileType: 'image/webp',
}

/**
 * 压缩图片文件
 * @param file - 原始图片文件
 * @param options - 压缩选项
 * @returns 压缩后的 File 对象（如果压缩失败或变大则返回原文件）
 */
export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

    const compressionOptions = {
        maxSizeMB: mergedOptions.maxSizeMB,
        maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
        useWebWorker: true,
        fileType: mergedOptions.fileType,
        initialQuality: mergedOptions.quality,
    }

    try {
        const compressedFile = await imageCompression(file, compressionOptions)

        // 如果压缩后变大，返回原文件
        if (compressedFile.size >= file.size) {
            return file
        }

        // 重命名文件扩展名（如果转为 webp）
        if (mergedOptions.fileType === 'image/webp') {
            const webpName = file.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
            return new File([compressedFile], webpName, { type: 'image/webp' })
        }

        return compressedFile
    } catch (error) {
        console.warn('图片压缩失败，使用原文件:', error)
        return file
    }
}

/**
 * 压缩并上传图片
 * @param file - 原始图片文件
 * @param options - 压缩选项
 * @returns 上传后的 URL
 */
export async function compressAndUpload(file: File, options?: CompressOptions): Promise<string> {
    const compressedFile = await compressImage(file, options)

    const formData = new FormData()
    formData.append('files', compressedFile)

    const res = await $fetch<{ data: { url: string }; success: boolean; msg: string }>('/api/files/upload', {
        method: 'POST',
        body: formData,
    })

    if (!res.success) {
        throw new Error(res.msg || '上传失败')
    }

    return res.data.url
}