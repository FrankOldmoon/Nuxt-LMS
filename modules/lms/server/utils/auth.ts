/**
 * lms module auth extensions
 *
 * Only provides lms-specific course permission check functions.
 * Base functions (hashPassword/verifyPassword/generateToken/getCurrentUser/requireAuth/requireRole/requirePermission/requireAdmin)
 * are provided by the base module and auto-imported by Nuxt; no need to re-export them here.
 */

import { requireAuth } from '../../../base/server/utils/auth'
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

/**
 * Check whether the current user is a teacher/editor of a course (either is acceptable)
 */
export async function isCourseTeacher(userId: number, courseId: number): Promise<boolean> {
  if (!(schema as any).userCourses) return false
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
  return rows.length > 0 && !!(rows[0].isTeacher || rows[0].isEditor)
}

/**
 * Check whether the current user is an editor of a course (editor only, not teacher)
 */
export async function isCourseEditor(userId: number, courseId: number): Promise<boolean> {
  if (!(schema as any).userCourses) return false
  const rows = await db
    .select({ isEditor: (schema as any).userCourses.isEditor })
    .from((schema as any).userCourses)
    .where(
      and(
        eq((schema as any).userCourses.userId, userId),
        eq((schema as any).userCourses.courseId, courseId),
      ),
    )
    .limit(1)
  return rows.length > 0 && !!rows[0].isEditor
}

/**
 * Require admin or editor of the target course, otherwise throw 403
 * @param courseId - course ID
 */
export async function requireCourseTeacher(event: any, courseId: number): Promise<ReturnType<typeof requireAuth>> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (await isCourseEditor(user.id, courseId)) return user

  throw createError({ statusCode: 403, message: 'No permission: only admins or course editors can perform this action' })
}

/**
 * Require admin or editor of the course that owns the target chapter
 * Automatically looks up the chapter's courseId before checking
 * @param chapterId - chapter ID
 */
export async function requireChapterTeacher(event: any, chapterId: number): Promise<ReturnType<typeof requireAuth>> {
  const user = await requireAuth(event)
  if (user.roles.includes('admin')) return user

  if (!(schema as any).chapters) {
    throw createError({ statusCode: 403, message: 'No permission' })
  }

  // Look up the course that owns this chapter
  const rows = await db
    .select({ courseId: (schema as any).chapters.courseId })
    .from((schema as any).chapters)
    .where(eq((schema as any).chapters.id, chapterId))
    .limit(1)

  if (!rows[0]) {
    throw createError({ statusCode: 404, message: 'Chapter not found' })
  }

  if (await isCourseEditor(user.id, rows[0].courseId)) return user

  throw createError({ statusCode: 403, message: 'No permission: only admins or editors of the course can perform this action' })
}
