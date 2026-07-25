/**
 * 共享的 find-or-create upsert helper
 *
 * userChapters / userCourses 的统一 upsert 入口。
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'

/** 查找 userChapter；若不存在则 insert 并返回新行；否则返回 null 表示已存在 */
export async function findUserChapter(userId: number, chapterId: number) {
  return db.query.userChapters.findFirst({
    where: and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)),
  })
}

/** 按 (userId, chapterId) 更新 userChapters */
export function updateUserChapter(
  userId: number, chapterId: number, setData: Record<string, any>,
) {
  return db.update(schema.userChapters).set(setData)
    .where(and(eq(schema.userChapters.userId, userId), eq(schema.userChapters.chapterId, chapterId)))
}

/** 查找 userCourse */
export async function findUserCourse(userId: number, courseId: number) {
  return db.query.userCourses.findFirst({
    where: and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)),
  })
}

/** 按 (userId, courseId) 更新 userCourses */
export function updateUserCourse(
  userId: number, courseId: number, setData: Record<string, any>,
) {
  return db.update(schema.userCourses).set(setData)
    .where(and(eq(schema.userCourses.userId, userId), eq(schema.userCourses.courseId, courseId)))
}
