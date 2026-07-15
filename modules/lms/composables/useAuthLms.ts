/**
 * useAuthLms — LMS authentication composable (reuses base useAuth)
 *
 * Design principles:
 * - The base useAuth obtains auth data via useFetch('/api/auth/me'),
 *   and transparently passes through the extension fields injected by the server-side runOnMeEnrich via [key: string]: any.
 * - LMS injects editorCourseIds /
 *   teacherCourseIds / classIds and other course-related fields into /api/auth/me on the server side.
 * - This composable only reuses all the capabilities of base useAuth, and on this basis derives
 *   LMS-specific course permission check methods, avoiding duplicate definitions of useFetch / login / logout etc.
 *
 * Note: Since useAuth and useAuthLms share the same useFetch cache key
 * ('/api/auth/me'), all callers read the same auth data.
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

  // ====================== LMS extension derived state ======================

  /** List of course IDs where the current user is an editor */
  const editorCourseIds = computed<number[]>(() => authData.value?.editorCourseIds ?? [])

  /** List of course IDs where the current user is a teacher */
  const teacherCourseIds = computed<number[]>(() => authData.value?.teacherCourseIds ?? [])

  /** List of class IDs the current user belongs to */
  const classIds = computed<number[]>(() => authData.value?.classIds ?? [])

  // ====================== LMS course permission checks ======================

  /** Check whether the current user is an editor of a course */
  function isCourseEditor(courseId: number): boolean {
    return editorCourseIds.value.includes(courseId)
  }

  /** Check whether the current user is a teacher or editor of a course (editor implies teacher permission) */
  function isCourseTeacher(courseId: number): boolean {
    return teacherCourseIds.value.includes(courseId) || editorCourseIds.value.includes(courseId)
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
    isCourseTeacher,
    login,
    register,
    logout,
    refreshUser,
  }
}
