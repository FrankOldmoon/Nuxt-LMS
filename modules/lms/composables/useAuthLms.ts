/**
 * useAuthLms — LMS 认证组合式函数（复用 base useAuth）
 *
 * 设计原理：
 * - base 的 useAuth 通过 useFetch('/api/auth/me') 获取认证数据，
 *   并以 [key: string]: any 透传 server 端 runOnMeEnrich 注入的扩展字段。
 * - LMS 在 server 端向 /api/auth/me 注入 editorCourseIds /
 *   teacherCourseIds / classIds 等课程相关字段。
 * - 本组合式函数仅复用 base useAuth 的全部能力，并在此基础上派生
 *   LMS 特有的课程权限检查方法，避免重复定义 useFetch / login / logout 等。
 *
 * 注意：由于 useAuth 与 useAuthLms 共享同一 useFetch 缓存 key
 * （'/api/auth/me'），所有调用方读到的是同一份认证数据。
 */
export function useAuthLms() {
  const {
    authData,
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
  } = useAuth()

  // ====================== LMS 扩展派生状态 ======================

  /** 当前用户作为编辑者的课程 ID 列表 */
  const editorCourseIds = computed<number[]>(() => authData.value?.editorCourseIds ?? [])

  /** 当前用户作为教师的课程 ID 列表 */
  const teacherCourseIds = computed<number[]>(() => authData.value?.teacherCourseIds ?? [])

  /** 当前用户所属班级 ID 列表 */
  const classIds = computed<number[]>(() => authData.value?.classIds ?? [])

  // ====================== LMS 课程权限检查 ======================

  /** 检查当前用户是否是某课程的编辑者 */
  function isCourseEditor(courseId: number): boolean {
    return editorCourseIds.value.includes(courseId)
  }

  /** 严格课程身份：本课程的教师或编辑者（不含 observer 兜底） */
  function isCourseStaff(courseId: number): boolean {
    return teacherCourseIds.value.includes(courseId) || editorCourseIds.value.includes(courseId)
  }

  /**
   * 能否编辑/操作该课程（写权限）。
   *
   * 与服务端 isCourseStaff 口径一致：admin 放行、observer 一律只读、其余看本课程身份。
   * 所有「编辑 / 批改 / 打分 / 分组 / 发公告」类入口都用它，不要用 isCourseTeacher ——
   * isCourseTeacher 对 observer 返回 true（为了让它看教师视角），拿它控写入口会出现
   * 「按钮能点、保存 403」。
   */
  function canEditCourse(courseId: number): boolean {
    if (hasRole('admin')) return true
    if (hasRole('observer')) return false
    return isCourseStaff(courseId)
  }

  /** 检查当前用户是否是某课程的教师或编辑者（编辑者隐含教师权限）。
      读/展示用：observer 视为所有课程的观察教师（只读，不含写权限）。
      写入口请改用 canEditCourse()。 */
  function isCourseTeacher(courseId: number): boolean {
    if (hasRole('observer')) return true
    return isCourseStaff(courseId)
  }

  return {
    user,
    roles,
    permissions,
    editorCourseIds,
    teacherCourseIds,
    classIds,
    isLoggedIn,
    isLoading,
    hasRole,
    hasAnyRole,
    hasPermission,
    isCourseEditor,
    isCourseStaff,
    canEditCourse,
    isCourseTeacher,
    login,
    register,
    logout,
    refreshUser,
  }
}
