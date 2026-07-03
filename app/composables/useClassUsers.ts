import type { LmsClassUser } from '#shared/types/lms'

/**
 * 全局班级用户缓存 composable
 * 在 modal.vue 中选择/切换班级时 fetchUsers，其他组件直接读取缓存数据
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
    // 已是当前班级+课程且已有数据则跳过
    const cacheKey = `${classId}:${courseId}`
    if (currentClassId.value === cacheKey && classUsers.value.length > 0) return
    currentClassId.value = cacheKey
    classUsersLoading.value = true
    try {
      const url = courseId
        ? `/api/lms/classes/users?classId=${classId}&course_id=${courseId}`
        : `/api/lms/classes/users?classId=${classId}`
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
