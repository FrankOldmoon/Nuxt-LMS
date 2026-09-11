/**
 * 切换用户默认班级（defaultClass）的复用逻辑。
 *
 * 从 useClassModal.switchClass 抽出，供 ClassSelector（弹窗内选班）与 ClassModal 共用：
 * 1. PUT /api/auth/me 写入 defaultClass
 * 2. 刷新认证用户（defaultClass 全局更新，侧边目录选中班会同步）
 * 3. 拉取该班在指定课程下的学生（useClassUsers 全局缓存）
 */

export async function switchDefaultClass(
  classId: number,
  className: string,
  courseId: number = 0,
): Promise<void> {
  await cRequest('/api/auth/me', {
    method: 'PUT',
    body: { defaultClass: { id: classId, name: className } },
  })
  const { refreshUser } = useAuth()
  await refreshUser()
  if (classId) {
    const { fetchUsers } = useClassUsers()
    await fetchUsers(classId, courseId || undefined)
  }
}