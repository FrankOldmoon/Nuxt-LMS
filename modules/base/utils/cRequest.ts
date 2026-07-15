/**
 * Generic request utility — automatically unwraps server { data, success, msg } responses
 *
 * Automatically injects course_id (route.params.id) and chapter_id (route.params.cid) from the route:
 * - GET requests: injected into URL query string
 * - POST requests: injected into body
 * - Skipped when value already exists, does not override caller-supplied parameters
 *
 * Date fields are converted uniformly by server middleware (server/middleware/convert-dates.ts),
 * the frontend can pass strings directly without manually converting to Date
 *
 * @example
 * // Imperative call (login, event handlers, etc.)
 * const result = await cRequest<LoginResult>('/api/login', { method: 'POST', body: { username, password } })
 *
 * // Composable call (SSR friendly)
 * const { data, pending, refresh } = cRequest.use<CourseDetail>('/api/courses/show?id=1')
 */

/**
 * Read course_id and chapter_id from the current route
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
 * Inject course_id and chapter_id into URL query string (skip if already present)
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
 * Inject course_id and chapter_id into body (skip if already present)
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

  // No body (GET etc.): inject into URL query string
  if (!options.body) {
    finalUrl = injectToUrl(url, courseId, chapterId)
  }

  // Has body (POST etc.): inject into body
  if (options.body && typeof options.body === 'object') {
    finalOptions.body = injectToBody(options.body, courseId, chapterId)
  }

  const resp = await $fetch<{ data: T; success: boolean; msg: string }>(finalUrl, finalOptions)
  if (!resp.success) {
    throw new Error(resp.msg || 'Request failed')
  }
  return resp.data
}

cRequest.use = <T = any>(url: string | (() => string) | Ref<string>, options: Record<string, any> = {}) => {
  const { transform: customTransform, ...rest } = options

  // Resolve url as a getter function, supporting string / function / Ref types
  const urlGetter = () => {
    if (typeof url === 'function') return (url as () => string)()
    if (url && typeof url === 'object' && 'value' in url) return (url as Ref<string>).value
    return url as string
  }

  // Use URL string as a stable key to ensure cache hits during client-side navigation
  const resolvedKey = urlGetter()

  // Automatically inject course_id and chapter_id into URL (reactive, recomputed on route change)
  const wrappedUrl = computed(() => {
    const rawUrl = urlGetter()
    if (!rawUrl) return ''
    const { courseId, chapterId } = getRouteIds()
    return injectToUrl(rawUrl, courseId, chapterId)
  })

  // Teacher and above roles (admin / teacher / editor) need to fetch the latest data on the client
  // Avoid SSR payload cache causing teachers to see stale data (e.g. chapter open state not refreshing after change)
  const { hasRole } = useAuth()
  const isTeacherPlus = () => hasRole('admin') || hasRole('teacher')

  const fetchResult = useFetch<T>(wrappedUrl, {
    ...rest,
    key: resolvedKey,
    getCachedData(key: string) {
      // Always return SSR payload data as the hydration initial value
      // If undefined is returned, Nuxt will initialize data with default() (usually null),
      // and since null !== undefined triggers the "hydration success" branch, skipping re-fetch,
      // causing the teacher's client-side data to be permanently null and page content to disappear
      const nuxtApp = useNuxtApp()
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    },
    transform: (raw: any) => {
      if (raw && typeof raw === 'object' && 'data' in raw && 'success' in raw) {
        return customTransform ? customTransform(raw.data) : (raw.data as T)
      }
      return customTransform ? customTransform(raw) : (raw as T)
    },
  } as any)

  // Teacher and above roles: refresh in background after client hydration completes to ensure latest data
  // (e.g. chapter open state changes), but without blocking rendering (data initial value comes from SSR payload)
  if (import.meta.client) {
    const instance = getCurrentInstance()
    if (instance) {
      onMounted(() => {
        if (isTeacherPlus()) {
          fetchResult.refresh()
        }
      })
    }
  }

  return fetchResult
}

export { cRequest }
