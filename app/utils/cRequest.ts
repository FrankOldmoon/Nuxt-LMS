/**
 * 通用请求工具 — 自动解包服务端 { data, success, msg } 响应
 *
 * @example
 * // 命令式调用（login、事件处理器等场景）
 * const result = await cRequest<LoginResult>('/api/login', { method: 'POST', body: { username, password } })
 *
 * // composable 调用（SSR 友好）
 * const { data, pending, refresh } = cRequest.use<CourseDetail>('/api/lms/courses/show?id=1')
 */
async function cRequest<T = any>(url: string, options: Record<string, any> = {}): Promise<T> {
  console.log('[cRequest]', options.method || 'GET', url)
  const resp = await $fetch<{ data: T; success: boolean; msg: string }>(url, options)
  console.log('[cRequest] response:', resp.success, resp.msg)
  if (!resp.success) {
    throw new Error(resp.msg || '请求失败')
  }
  return resp.data
}

cRequest.use = <T = any>(url: string | (() => string), options: Record<string, any> = {}) => {
  const { transform: customTransform, ...rest } = options
  return useFetch<T>(url, {
    ...rest,
    transform: (raw: any) => {
      console.log('[cRequest.use]', typeof url === 'function' ? url() : url, raw)
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        return customTransform ? customTransform(raw.data) : (raw.data as T)
      }
      return customTransform ? customTransform(raw) : (raw as T)
    },
  } as any)
}

export { cRequest }
