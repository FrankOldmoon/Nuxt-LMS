import type { LmsClassUser } from '#lms/types/lms'

/**
 * Global class user cache composable
 * fetchUsers when selecting/switching class in modal.vue, other components read cached data directly
 */
export function useClassUsers() {
  const classUsers = useState<LmsClassUser[]>('class-users', () => [])
  const classUsersLoading = useState<boolean>('class-users-loading', () => false)
  const currentClassId = useState<string | null>('class-users-class-id', () => null)

  const students = computed(() => classUsers.value.filter((u) => !u.isTeacher))
  const teachers = computed(() => classUsers.value.filter((u) => u.isTeacher))

  async function fetchUsers(classId: number | null, courseId: number = 0) {
    if (!classId) {
      classUsers.value = []
      currentClassId.value = null
      return
    }
    // Skip if already current class+course and data exists
    const cacheKey = `${classId}:${courseId}`
    if (currentClassId.value === cacheKey && classUsers.value.length > 0) return
    currentClassId.value = cacheKey
    classUsersLoading.value = true
    try {
      const url = courseId
        ? `/api/classes/users?classId=${classId}&course_id=${courseId}`
        : `/api/classes/users?classId=${classId}`
      const data = await cRequest<LmsClassUser[]>(url)
      classUsers.value = data || []
    } catch {
      classUsers.value = []
    } finally {
      classUsersLoading.value = false
    }
  }

  function clearUsers() {
    classUsers.value = []
    currentClassId.value = null
  }

  return { classUsers, students, teachers, classUsersLoading, currentClassId, fetchUsers, clearUsers }
}
