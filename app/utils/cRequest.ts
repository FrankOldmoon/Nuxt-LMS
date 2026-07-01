/** 服务端 cResp 统一响应结构 */
interface CResponse<T = any> {
  data: T
  msg: string
  success: boolean
}

/**
 * 通用请求工具 — 自动解包服务端 cResp 响应
 *
 * @example
 * // GET 请求
 * const course = await cRequest.get<LmsCourseDetail>(`/api/lms/course/${id}`)
 *
 * // POST 请求
 * const result = await cRequest.post<Chapter>('/api/lms/chapters/add', { name: '新章节', courseId: 1 })
 *
 * // 原始请求（不解包，用于文件上传等非 cResp 接口）
 * const res = await cRequest.raw('/api/upload', { method: 'POST', body: formData })
 *
 * // 在 useAsyncData 中使用（支持 SSR）
 * const { data } = useAsyncData(() => cRequest.get<LmsCourseDetail>(`/api/lms/course/${id}`))
 */
async function cRequest<T = any>(url: string, options: Record<string, any> = {}): Promise<T> {
  const resp = await $fetch<CResponse<T>>(url, options)
  console.log('[cRequest]', options.method || 'GET', url, resp)
  if (!resp.success) {
    throw new Error(resp.msg || '请求失败')
  }
  return resp.data
}

cRequest.get = <T = any>(url: string, options: Record<string, any> = {}) =>
  cRequest<T>(url, { ...options, method: 'GET' })

cRequest.post = <T = any>(url: string, body?: any, options: Record<string, any> = {}) =>
  cRequest<T>(url, { ...options, method: 'POST', body })

cRequest.put = <T = any>(url: string, body?: any, options: Record<string, any> = {}) =>
  cRequest<T>(url, { ...options, method: 'PUT', body })

cRequest.del = <T = any>(url: string, options: Record<string, any> = {}) =>
  cRequest<T>(url, { ...options, method: 'DELETE' })

/** 原始请求，不做 cResp 解包（文件上传等非统一响应接口） */
cRequest.raw = <T = any>(url: string, options: Record<string, any> = {}) =>
  $fetch<T>(url, options)

export { cRequest }

/** useCRequest 的选项类型 */
interface UseCRequestOptions<T> {
  default?: () => T
  transform?: (data: T) => T
  watch?: any[]
  [key: string]: any
}

/**
 * 基于 useFetch 的 composable 版本，自动解包 cResp + 支持 SSR 去重
 *
 * @example
 * const { data, pending, refresh } = useCRequest<LmsHomeData>('/api/lms/home', {
 *   default: () => ({ categories: [], courses: [] }),
 * })
 */
export function useCRequest<T = any>(
  url: string | (() => string),
  opts: UseCRequestOptions<T> = {},
) {
  const { transform: customTransform, ...rest } = opts
  return useFetch<T>(url, {
    ...rest,
    transform: (raw: any) => {
      console.log('[useCRequest] raw:', url, raw)
      let data = raw
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        data = raw.data
      }
      return customTransform ? customTransform(data) : (data as T)
    },
  } as any)
}
