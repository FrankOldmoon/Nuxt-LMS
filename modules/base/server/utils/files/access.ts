/**
 * 小组文件访问控制
 *
 * file.group 格式：`${courseId}_${groupName}`（前端 useCourseGroups.activeGroupId 生成）
 * 用户分组成员存于 userCourses.group：组员为 `${groupName}`，组长为 `c_${groupName}`
 *
 * 访问规则：文件所有者 / teacher / admin 直接放行；
 * 其他用户必须是该小组所在课程内该组的成员（组长或组员）。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'

export async function canAccessGroupFile(
  user: { id: number; roles: string[] },
  file: { group: string | null; userId: number | null },
): Promise<boolean> {
  // 个人文件仅所有者可操作（外层已有判断，这里兜底）
  if (!file.group) return file.userId === user.id
  // 所有者 / 教师 / 管理员放行
  if (file.userId === user.id) return true
  if (user.roles?.some(r => r === 'teacher' || r === 'admin')) return true

  // 解析 `${courseId}_${groupName}`（courseId 为数字前缀）
  const m = /^(.+?)_(.+)$/.exec(file.group)
  if (!m) return false
  const courseId = Number(m[1])
  const groupName = m[2]
  if (!courseId || !groupName) return false

  // lms 模块的 userCourses 表（schema 运行时合并，base 内以 any 访问）
  const userCourses = (schema as any).userCourses
  if (!userCourses) return false
  const rows: { group: string | null }[] = await db.query.userCourses.findMany({
    where: and(
      eq(userCourses.userId, user.id),
      eq(userCourses.courseId, courseId),
      inArray(userCourses.group, [groupName, `c_${groupName}`]),
    ),
  })
  return rows.length > 0
}
