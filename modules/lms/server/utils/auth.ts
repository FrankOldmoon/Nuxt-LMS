/**
 * lms 模块鉴权扩展
 *
 * 仅提供 lms 特有的课程权限检查功能。
 * 基础功能（hashPassword/verifyPassword/generateToken/getCurrentUser/requireAuth/requireRole/requirePermission/requireAdmin）
 * 由 base 模块提供，Nuxt auto-import 自动扫描，无需在此重导出。
 */

import { requireAuth } from '../../../base/server/utils/auth'
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/** 查询某用户在某课程上的身份标志（无记录时均为 false） */
async function courseFlags(userId: number, courseId: number): Promise<{ isTeacher: boolean; isEditor: boolean }> {
  if (!(schema as any).userCourses) return { isTeacher: false, isEditor: false }
  const rows = await db
    .select({ isTeacher: (schema as any).userCourses.isTeacher, isEditor: (schema as any).userCourses.isEditor })
    .from((schema as any).userCourses)
    .where(
      and(
        eq((schema as any).userCourses.userId, userId),
        eq((schema as any).userCourses.courseId, courseId),
      ),
    )
    .limit(1)
  return {
    isTeacher: rows.length > 0 && !!rows[0].isTeacher,
    isEditor: rows.length > 0 && !!rows[0].isEditor,
  }
}

/**
 * 严格判定：用户在该课程上是否具备教师/编辑者身份（只看 user_courses 标志）。
 * **写操作必须用这个** —— observer 的只读兜底不在此生效。
 */
export async function isCourseStaff(userId: number, courseId: number): Promise<boolean> {
  const flags = await courseFlags(userId, courseId)
  return flags.isTeacher || flags.isEditor
}

/**
 * 读/展示用：严格课程身份 || observer 全局观察兜底。
 * observer 视为所有课程的「非 editor 教师」，因此能用教师视角看全部章节与学情数据；
 * 但**不能**据此放行任何写操作（写操作一律走 isCourseStaff / requireCourseTeacher）。
 */
export async function isCourseTeacher(userId: number, courseId: number): Promise<boolean> {
  if (await isCourseStaff(userId, courseId)) return true
  return await isObserver(userId)
}

/** 判断用户是否拥有 observer（只读观察者）角色 */
async function isObserver(userId: number): Promise<boolean> {
  const rows = await db
    .select({ code: schema.roles.code })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.roles.code, 'observer')))
    .limit(1)
  return rows.length > 0
}

/**
 * 检查当前用户是否是某课程的编辑者（仅编辑者，不含教师、不含 observer 兜底）
 */
export async function isCourseEditor(userId: number, courseId: number): Promise<boolean> {
  const flags = await courseFlags(userId, courseId)
  return flags.isEditor
}

/**
 * 要求是管理员或是目标课程的编辑者，否则抛 403
 * @param courseId - 课程 ID
 */
export async function requireCourseTeacher(event: any, courseId: number): Promise<ReturnType<typeof requireAuth>> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (await isCourseEditor(user.id, courseId)) return user

  throw createError({ statusCode: 403, message: '无权限：仅管理员或课程编辑者可操作' })
}

/**
 * 要求是管理员或是目标章节所属课程的编辑者
 * 自动查询章节的 courseId 再做判断
 * @param chapterId - 章节 ID
 */
export async function requireChapterTeacher(event: any, chapterId: number): Promise<ReturnType<typeof requireAuth>> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (!(schema as any).chapters) {
    throw createError({ statusCode: 403, message: '无权限' })
  }

  // 查询章节所属课程
  const rows = await db
    .select({ courseId: (schema as any).chapters.courseId })
    .from((schema as any).chapters)
    .where(eq((schema as any).chapters.id, chapterId))
    .limit(1)

  if (!rows[0]) {
    throw createError({ statusCode: 404, message: '章节不存在' })
  }

  if (await isCourseEditor(user.id, rows[0].courseId)) return user

  throw createError({ statusCode: 403, message: '无权限：仅管理员或该课程的编辑者可操作' })
}

/**
 * 检查当前用户是否是某班级的教师（userClasses.isTeacher 标志）
 */
export async function isClassTeacher(userId: number, classId: number): Promise<boolean> {
  const rows = await db
    .select({ isTeacher: schema.userClasses.isTeacher })
    .from(schema.userClasses)
    .where(
      and(
        eq(schema.userClasses.userId, userId),
        eq(schema.userClasses.classId, classId),
      ),
    )
    .limit(1)
  return rows.length > 0 && !!rows[0].isTeacher
}

/**
 * 要求是管理员或是目标班级的教师，否则抛 403
 * @param classId - 班级 ID
 */
export async function requireClassTeacher(event: any, classId: number): Promise<ReturnType<typeof requireAuth>> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (await isClassTeacher(user.id, classId)) return user

  throw createError({ statusCode: 403, message: '无权限：仅管理员或该班级的教师可操作' })
}
