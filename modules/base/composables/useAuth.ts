// ====================== 类型定义 ======================

interface User {
  id: number
  username: string
  name: string
  email?: string | null
  avatarImg?: string | null
  preferName?: string | null
  englishName?: string | null
  gender?: string | null
  rollNumber?: string | null
  classId?: number | null
  telephone?: string | null
  defaultClass?: { id: number; name: string } | null
  defaultLocale?: string | null
}

interface Role {
  code: string
  name: string
}

interface Permission {
  code: string
  name: string
}

interface AuthData {
  user: User
  roles: Role[]
  permissions: Permission[]
  [key: string]: any
}

// ====================== SSR 兼容的状态管理 ======================

/**
 * useAuth — 基于 useFetch 的 SSR 兼容认证组合式函数
 *
 * 核心原理：
 * - 使用 useFetch 在 SSR 阶段发起内部请求（cookie 自动转发）
 * - 返回数据被序列化到页面 payload 中，客户端 hydration 时直接还原
 * - 多个组件调用 useAuth() 共享同一份 useAsyncData 缓存
 *
 * base 仅返回 user/roles/permissions；后续模块（如 lms）可通过
 * server 端 runOnMeEnrich 钩子向 /api/auth/me 注入额外字段，
 * 这些字段会通过 [key: string]: any 透传到 authData 上。
 */
export function useAuth() {
  // 使用 useFetch（底层 useAsyncData）实现 SSR 兼容
  // 服务端请求时会自动转发浏览器 cookie，客户端会从 payload 还原数据
  const { data: authData, refresh: refreshUser, status } = useFetch('/api/auth/me', {
    // 显式 key，供 getAuthUserSync 从 payload 缓存读取
    key: 'auth:me',
    // 服务端也请求（SSR），确保首屏就有用户数据
    server: true,
    // 懒加载关闭，setup 阶段即发起请求
    lazy: false,
    // 多个组件/组合式函数都会调用 useAuth()，默认 dedupe:'cancel' 会让同 key 的新调用
    // 取消上一次在途请求并重启，造成进入页面时多次 /api/auth/me 后又自动取消。
    // 'defer' 让后续同 key 调用等待在途请求，收敛为单次请求。
    dedupe: 'defer',
    // 解析 { data, success, msg } 包裹格式
    transform: (raw: any) => {
      if (raw && raw.success && raw.data) {
        return raw.data as AuthData
      }
      return null
    },
  })

  // ====================== 派生状态 ======================

  const user = computed(() => authData.value?.user ?? null)
  const roles = computed<Role[]>(() => authData.value?.roles ?? [])
  const permissions = computed<Permission[]>(() => authData.value?.permissions ?? [])
  const isLoggedIn = computed(() => !!user.value)
  const isLoading = computed(() => status.value === 'pending')

  // ====================== 权限检查方法 ======================

  /** 检查当前用户是否拥有指定角色 */
  function hasRole(code: string): boolean {
    return roles.value.some((r) => r.code === code)
  }

  /** 检查当前用户是否拥有任一角色 */
  function hasAnyRole(codes: string[]): boolean {
    return codes.some((code) => hasRole(code))
  }

  /** 检查当前用户是否拥有指定权限 */
  function hasPermission(code: string): boolean {
    return permissions.value.some((p) => p.code === code)
  }

  // ====================== 变更方法（仅客户端调用） ======================

  /** 登录 */
  async function login(username: string, password: string) {
    const result = await cRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    await refreshUser()
    return result
  }

  /** 注册 */
  async function register(username: string, password: string, name: string, email?: string) {
    const result = await cRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: { username, password, name, email },
    })
    await refreshUser()
    return result
  }

  /** 登出 */
  async function logout() {
    await cRequest('/api/auth/logout', { method: 'POST' })
    await refreshUser()
  }

  return {
    user,
    roles,
    permissions,
    isLoggedIn,
    isLoading,
    hasRole,
    hasAnyRole,
    hasPermission,
    login,
    register,
    logout,
    refreshUser,
    // 暴露原始 useFetch 数据，供后续模块（如 lms useAuthLms）读取扩展字段
    // （editorCourseIds / teacherCourseIds / classIds 等由 server runOnMeEnrich 注入）
    authData,
  }
}

/**
 * 同步读取当前认证用户（从 payload 缓存，不触发 useFetch）
 * 适用于不能调用 useAuth() 的非 setup 上下文（如 WebSocket 回调、watch 回调）
 */
export function getAuthUserSync(): User | null {
  const nuxtApp = useNuxtApp()
  const authData = nuxtApp.payload.data['auth:me'] as AuthData | null | undefined
  return authData?.user ?? null
}
