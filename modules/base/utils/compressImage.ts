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
 * Worker 内运行的库脚本地址（同源本地文件）。
 *
 * browser-image-compression 在 `useWebWorker: true` 时会 new Worker(blob)，
 * 并在 Worker 内 `importScripts(libURL)` 重新加载自身，而 `libURL` 的默认值是
 * jsdelivr CDN（https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/...）——
 * 也就是说，即使项目里不写任何 CDN 地址，只要开了 Web Worker 就会向 jsdelivr 发请求
 * （内网 / 无外网环境会悬挂或失败）。
 * 这里改为同源文件（public/browser-image-compression.js，即该包 dist/browser-image-compression.js 原样拷贝），
 * 从而完全不发起外部请求。若该文件缺失，Worker 会报错并由库内建的 fallback 自动降级为主线程压缩，功能不受影响。
 */
function resolveWorkerLibUrl(): string {
    if (typeof window === 'undefined') return ''
    try {
        // 与 Nuxt 的 app.baseURL（Vite BASE_URL）保持一致，避免部署在子路径时取错文件
        const base = String((import.meta as any).env?.BASE_URL || '/').replace(/\/+$/, '')
        return new URL(`${base}/browser-image-compression.js`, window.location.origin).href
    } catch {
        return ''
    }
}

/**
 * 压缩图片文件
 * @param file - 原始图片文件
 * @param options - 压缩选项
 * @returns 压缩后的 File 对象（如果压缩失败或变大则返回原文件）
 */
export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
    // GIF 保持原格式不压缩（避免丢失动画）
    if (file.type === 'image/gif') {
        return file
    }
    // SVG 为矢量文本，保持原格式不压缩（压缩成 webp 会破坏矢量且丢失后缀一致性）
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
        return file
    }

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
    const libUrl = resolveWorkerLibUrl()

    const compressionOptions = {
        maxSizeMB: mergedOptions.maxSizeMB,
        maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
        // 无 window（SSR / 测试）时不需要 Worker；浏览器内用 Worker + 同源本地库脚本
        useWebWorker: Boolean(libUrl),
        ...(libUrl ? { libURL: libUrl } : {}),
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