/**
 * Shared find-or-create upsert helpers
 *
 * Unified upsert entry points for userChapters / userCourses.
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/** Find a userChapter; if not found, return null (existence check) */
export async function findUserChapter(userId: number, chapterId: number) {
  return db.query.userChapters.findFirst({
    where: and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)),
  })
}

/** Update userChapters by (userId, chapterId) */
export function updateUserChapter(
  userId: number, chapterId: number, setData: Record<string, any>,
) {
  return db.update(schema.userChapters).set(setData)
    .where(and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)))
}

/** Find a userCourse */
export async function findUserCourse(userId: number, courseId: number) {
  return db.query.userCourses.findFirst({
    where: and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)),
  })
}

/** Update userCourses by (userId, courseId) */
export function updateUserCourse(
  userId: number, courseId: number, setData: Record<string, any>,
) {
  return db.update(schema.userCourses).set(setData)
    .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
}
