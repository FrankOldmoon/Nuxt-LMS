/**
 * 全局班级用户缓存 composable（doc stub）
 *
 * lms 未启用时返回空数据，确保 doc 模块中的 race.vue 等组件不会崩溃。
 * lms 启用时，lms/composables/useClassUsers.ts 覆盖本 composable，
 * 提供真实的班级用户数据管理。
 *
 * 本文件位于 stubs/ 子目录，仅当 lms 模块未启用时由 doc/index.ts 注册，
 * 避免与 lms 版本产生 "Duplicated imports" 警告。
 */
export function useClassUsers() {
  const students = useState<any[]>('class-users-students', () => [])
  const teachers = useState<any[]>('class-users-teachers', () => [])
  const classUsersLoading = useState<boolean>('class-users-loading', () => false)

  async function fetchUsers(_classId: number | null, _courseId: number = 0) {
    // no-op stub
  }

  function clearUsers() {
    // no-op stub
  }

  return { students, teachers, classUsersLoading, fetchUsers, clearUsers }
}
