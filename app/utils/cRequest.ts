/**
 * 通用请求工具 — 自动解包服务端 { data, success, msg } 响应
 *
 * 自动从路由注入 course_id（route.params.id）和 chapter_id（route.params.cid）：
 * - GET 请求：注入到 URL query string
 * - POST 请求：注入到 body
 * - 已有值时跳过，不覆盖调用方手动传入的参数
 *
 * @example
 * // 命令式调用（login、事件处理器等场景）
 * const result = await cRequest<LoginResult>('/api/login', { method: 'POST', body: { username, password } })
 *
 * // composable 调用（SSR 友好）
 * const { data, pending, refresh } = cRequest.use<CourseDetail>('/api/lms/courses/show?id=1')
 */

/**
 * 从当前路由读取 course_id 和 chapter_id
 * route.params.id → course_id
 * route.params.cid → chapter_id
 */
function getRouteIds() {
  try {
    const route = useRoute()
    return {
      courseId: route.params.id ? Number(route.params.id) : 0,
      chapterId: route.params.cid ? Number(route.params.cid) : 0,
    }
  } catch {
    return { courseId: 0, chapterId: 0 }
  }
}

/**
 * 将 course_id 和 chapter_id 注入到 URL query string（已有则跳过）
 */
function injectToUrl(url: string, courseId: number, chapterId: number): string {
  let result = url
  if (typeof result == 'string' && courseId && !result.match(/[?&]course_id=/)) {
    result += (result.includes('?') ? '&' : '?') + `course_id=${courseId}`
  }
  if (typeof result == 'string' && chapterId && !result.match(/[?&]chapter_id=/)) {
    result += (result.includes('?') ? '&' : '?') + `chapter_id=${chapterId}`
  }
  return result
}

/**
 * 将 course_id 和 chapter_id 注入到 body（已有则跳过）
 */
function injectToBody(body: any, courseId: number, chapterId: number): any {
  if (!body || typeof body !== 'object') return body
  const result = { ...body }
  if (courseId && result.course_id === undefined) result.course_id = courseId
  if (chapterId && result.chapter_id === undefined) result.chapter_id = chapterId
  return result
}

async function cRequest<T = any>(url: string, options: Record<string, any> = {}): Promise<T> {
  const { courseId, chapterId } = getRouteIds()

  let finalUrl = url
  let finalOptions = { ...options }

  // 无 body（GET 等）：注入到 URL query string
  if (!options.body) {
    finalUrl = injectToUrl(url, courseId, chapterId)
  }

  // 有 body（POST 等）：注入到 body
  if (options.body && typeof options.body === 'object') {
    finalOptions.body = injectToBody(options.body, courseId, chapterId)
  }

  console.log('[cRequest]', options.method || 'GET', finalUrl)
  const resp = await $fetch<{ data: T; success: boolean; msg: string }>(finalUrl, finalOptions)
  console.log('[cRequest] response:', resp.success, resp.msg, resp.data)
  if (!resp.success) {
    throw new Error(resp.msg || '请求失败')
  }
  return resp.data
}

cRequest.use = <T = any>(url: string | (() => string) | Ref<string>, options: Record<string, any> = {}) => {
  const { transform: customTransform, ...rest } = options

  // 解析 url 为 getter 函数，支持 string / function / Ref 三种类型
  const urlGetter = () => {
    if (typeof url === 'function') return (url as () => string)()
    if (url && typeof url === 'object' && 'value' in url) return (url as Ref<string>).value
    return url as string
  }

  // 用 URL 字符串作为稳定 key，确保客户端导航时能命中缓存
  const resolvedKey = urlGetter()

  // 自动注入 course_id 和 chapter_id 到 URL（响应式，路由变化时重新计算）
  const wrappedUrl = computed(() => {
    const rawUrl = urlGetter()
    if (!rawUrl) return ''
    const { courseId, chapterId } = getRouteIds()
    return injectToUrl(rawUrl, courseId, chapterId)
  })

  return useFetch<T>(wrappedUrl, {
    ...rest,
    key: resolvedKey,
    getCachedData(key: string) {
      // 客户端导航时优先复用 SSR payload 数据，避免重复请求
      const nuxtApp = useNuxtApp()
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
    },
    transform: (raw: any) => {
      console.log('[cRequest.use]', urlGetter(), raw)
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        return customTransform ? customTransform(raw.data) : (raw.data as T)
      }
      return customTransform ? customTransform(raw) : (raw as T)
    },
  } as any)
}

export { cRequest }
