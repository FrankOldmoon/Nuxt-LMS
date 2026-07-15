/**
 * Image compression utility functions
 * Uses browser-image-compression library for smart compression
 */
import imageCompression from 'browser-image-compression'

/**
 * Image compression configuration
 */
export interface CompressOptions {
    maxSizeMB?: number           // Maximum file size (MB)
    maxWidthOrHeight?: number    // Maximum width/height (px)
    quality?: number             // Compression quality (0-1)
    fileType?: string            // Output format
}

const DEFAULT_OPTIONS: CompressOptions = {
    maxSizeMB: 2,
    maxWidthOrHeight: 3840,
    quality: 0.8,
    fileType: 'image/webp',
}

/**
 * Compress image file
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed File object (returns original file if compression fails or file becomes larger)
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

        // If compressed file is larger, return original file
        if (compressedFile.size >= file.size) {
            return file
        }

        // Rename file extension (if converted to webp)
        if (mergedOptions.fileType === 'image/webp') {
            const webpName = file.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
            return new File([compressedFile], webpName, { type: 'image/webp' })
        }

        return compressedFile
    } catch (error) {
        console.warn('Image compression failed, using original file:', error)
        return file
    }
}

/**
 * Compress and upload image
 * @param file - Original image file
 * @param options - Compression options
 * @returns Uploaded URL
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
        throw new Error(res.msg || 'Upload failed')
    }

    return res.data.url
}