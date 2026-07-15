// ====================== Type definitions ======================

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

// ====================== SSR-compatible state management ======================

/**
 * useAuth — SSR-compatible auth composable based on useFetch
 *
 * Core principle:
 * - Uses useFetch to make internal requests during SSR (cookies auto-forwarded)
 * - Returned data is serialized into page payload, restored directly on client hydration
 * - Multiple components calling useAuth() share the same useAsyncData cache
 *
 * base only returns user/roles/permissions; subsequent modules (e.g. lms) can inject
 * additional fields into /api/auth/me via the server-side runOnMeEnrich hook,
 * these fields are passed through to authData via [key: string]: any.
 */
export function useAuth() {
  // Use useFetch (underlying useAsyncData) for SSR compatibility
  // Server requests auto-forward browser cookies, client restores data from payload
  const { data: authData, refresh: refreshUser, status } = useFetch('/api/auth/me', {
    // Explicit key, for getAuthUserSync to read from payload cache
    key: 'auth:me',
    // Server also requests (SSR), ensure user data is available on first screen
    server: true,
    // Lazy loading disabled, request initiated during setup phase
    lazy: false,
    // Parse { data, success, msg } wrapper format
    transform: (raw: any) => {
      if (raw && raw.success && raw.data) {
        return raw.data as AuthData
      }
      return null
    },
  })

  // ====================== Derived state ======================

  const user = computed(() => authData.value?.user ?? null)
  const roles = computed<Role[]>(() => authData.value?.roles ?? [])
  const permissions = computed<Permission[]>(() => authData.value?.permissions ?? [])
  const isLoggedIn = computed(() => !!user.value)
  const isLoading = computed(() => status.value === 'pending')

  // ====================== Permission check methods ======================

  /** Check if current user has the specified role */
  function hasRole(code: string): boolean {
    return roles.value.some((r) => r.code === code)
  }

  /** Check if current user has any of the specified roles */
  function hasAnyRole(codes: string[]): boolean {
    return codes.some((code) => hasRole(code))
  }

  /** Check if current user has the specified permission */
  function hasPermission(code: string): boolean {
    return permissions.value.some((p) => p.code === code)
  }

  // ====================== Mutation methods (client-side only) ======================

  /** Login */
  async function login(username: string, password: string) {
    const result = await cRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    await refreshUser()
    return result
  }

  /** Register */
  async function register(username: string, password: string, name: string, email?: string) {
    const result = await cRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: { username, password, name, email },
    })
    await refreshUser()
    return result
  }

  /** Logout */
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
    // Expose raw useFetch data for subsequent modules (e.g. lms useAuthLms) to read extended fields
    // (editorCourseIds / teacherCourseIds / classIds etc. injected by server runOnMeEnrich)
    authData,
  }
}

/**
 * Synchronously read current authenticated user (from payload cache, does not trigger useFetch)
 * Suitable for non-setup contexts where useAuth() cannot be called (e.g. WebSocket callbacks, watch callbacks)
 */
export function getAuthUserSync(): User | null {
  const nuxtApp = useNuxtApp()
  const authData = nuxtApp.payload.data['auth:me'] as AuthData | null | undefined
  return authData?.user ?? null
}
