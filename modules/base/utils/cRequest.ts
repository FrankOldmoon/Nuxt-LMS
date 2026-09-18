/**
 * 通用请求工具 — 自动解包服务端 { data, success, msg } 响应
 *
 * 自动从路由注入 course_id（route.params.id）和 chapter_id（route.params.cid）：
 * - GET 请求：注入到 URL query string
 * - POST 请求：注入到 body
 * - 已有值时跳过，不覆盖调用方手动传入的参数
 *
 * 日期字段由服务端中间件统一转换（server/middleware/convert-dates.ts），
 * 前端直接传字符串即可，无需手动转 Date
 *
 * @example
 * // 命令式调用（login、事件处理器等场景）
 * const result = await cRequest<LoginResult>('/api/login', { method: 'POST', body: { username, password } })
 *
 * // composable 调用（SSR 友好）
 * const { data, pending, refresh } = cRequest.use<CourseDetail>('/api/courses/show?id=1')
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
export function injectToUrl(url: string, courseId: number, chapterId: number): string {
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
export function injectToBody(body: any, courseId: number, chapterId: number): any {
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

  const resp = await $fetch<{ data: T; success: boolean; msg: string; code?: string }>(finalUrl, finalOptions)
  if (!resp.success) {
    const err: any = new Error(resp.msg || '请求失败')
    if (resp.code) err.code = resp.code
    throw err
  }
  return resp.data
}

cRequest.use = <T = any>(url: string | (() => string) | Ref<string>, options: Record<string, any> = {}) => {
  const { transform: customTransform, skipInjectIds, keyPrefix = '', ...rest } = options

  // 解析 url 为 getter 函数，支持 string / function / Ref 三种类型
  const urlGetter = () => {
    if (typeof url === 'function') return (url as () => string)()
    if (url && typeof url === 'object' && 'value' in url) return (url as Ref<string>).value
    return url as string
  }

  // 稳定 key：以「当前 URL」为缓存键。
  // 对于函数式 url（如 useChapterPage 的 /api/chapters/show?id=chapterId），
  // 章节切换时 urlGetter 返回值变化 → key 随之变化 → Nuxt 重新请求最新章节，
  // 而不会命中首次 URL 的固定 key 缓存导致数据不更新。（纯字符串 url 不受影响）
  //
  // keyPrefix：为同一 URL 但生命周期不同的调用（如持久侧边栏导航 vs 路由页面详情）
  // 提供独立的 Nuxt asyncData key，避免共用 key 导致的路由切换时
  // 一方 unmount/abort 让另一方读到空数据（课程页误显示 not found）。
  const key = computed(() => keyPrefix + urlGetter())

  // 自动注入 course_id 和 chapter_id 到 URL（响应式，路由变化时重新计算）。
  // skipInjectIds=true 时跳过注入（用于"课程级、与当前章节无关"的请求，如侧边栏导航，
  // 避免 chapter_id 变化导致 URL 变化而触发不必要的重拉）
  const wrappedUrl = computed(() => {
    const rawUrl = urlGetter()
    if (!rawUrl) return ''
    const { courseId, chapterId } = getRouteIds()
    return skipInjectIds ? rawUrl : injectToUrl(rawUrl, courseId, chapterId)
  })

  // 教师以上角色（admin / teacher / editor）需要在客户端获取最新数据
  // 避免 SSR payload 缓存导致教师看到旧数据（如章节开放状态变更后不刷新）
  const { hasRole } = useAuth()
  const isTeacherPlus = () => hasRole('admin') || hasRole('teacher')

  const fetchResult = useFetch<T>(wrappedUrl, {
    ...rest,
    key,
    // 同一 key 可能被多个 useFetch 实例注册（如课程页 useSidebarNav + useCourseDetailPage，
    // 章节页 useChapterPage + useAside），默认 dedupe='cancel' 会让后挂载的实例
    // abort 前一个进行中的请求并重发（network 出现多次取消、最后一次才成功）。
    // 'defer'：有进行中请求时直接复用，不 abort、不重复发（完成后自动清除，不影响 refresh）。
    dedupe: 'defer',
    getCachedData(key: string) {
      // 始终返回 SSR payload 数据作为 hydration 初始值
      // 若返回 undefined，Nuxt 会用 default()（通常为 null）初始化 data，
      // 且因 null !== undefined 触发 "hydration success" 分支，跳过重新请求，
      // 导致教师客户端 data 永久为 null、页面内容消失
      const nuxtApp = useNuxtApp()
      const v = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      // 缓存值为 null 时视为"无缓存"（返回 undefined 走正常请求路径）：
      // 若直接返回 null，useAsyncData.execute 的 getCachedData 分支
      // （cachedData !== void 0）会短路并跳过请求，data 保持 null，
      // 导致客户端路由跳转到课程/章节时误显示 not found（刷新才恢复）。
      return v === null ? undefined : v
    },
    transform: (raw: any) => {
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        return customTransform ? customTransform(raw.data) : (raw.data as T)
      }
      return customTransform ? customTransform(raw) : (raw as T)
    },
  } as any)

  // 教师以上角色：客户端 hydration 完成后后台刷新，确保看到最新数据
  // （如章节开放状态变更），但不阻塞渲染（data 初始值来自 SSR payload）
  if (import.meta.client) {
    const instance = getCurrentInstance()
    if (instance) {
      onMounted(() => {
        if (isTeacherPlus()) {
          fetchResult.refresh()
        }
      })
      // 客户端请求失败（瞬时网络错误等）自动重试一次，避免路由跳转后
      // 课程/章节页面因一次失败误显示 not found（data 为 null）。
      // 仅对 fetch 被拒绝（网络/HTTP 错误）触发；API 正常返回"不存在"不会进入 error 状态。
      let retried = false
      watch(() => fetchResult.status.value, (s) => {
        if (!retried && s === 'error') {
          retried = true
          fetchResult.refresh()
        }
      })
    }
  }

  return fetchResult
}

export { cRequest }
