/**
 * Course member management
 *
 * getCourseMembers / updateCourseMember
 */
import { db, schema } from "@nuxthub/db"
import { eq, and, isNull, or } from "drizzle-orm"

/**
 * Get the list of teachers and editors for a course
 */
export async function getCourseMembers(courseId: number) {
  return db
    .select({
      userId: schema.userCourses.userId,
      isTeacher: schema.userCourses.isTeacher,
      isEditor: schema.userCourses.isEditor,
      username: schema.users.username,
      name: schema.users.name,
      avatarImg: schema.users.avatarImg,
    })
    .from(schema.userCourses)
    .innerJoin(schema.users, eq(schema.userCourses.userId, schema.users.id))
    .where(
      and(
        eq(schema.userCourses.courseId, courseId),
        isNull(schema.userCourses.deletedAt),
        or(
          eq(schema.userCourses.isTeacher, true),
          eq(schema.userCourses.isEditor, true),
        ),
      ),
    )
}

/**
 * Add or remove a course's teacher/editor
 */
export async function updateCourseMember(
  courseId: number,
  userId: number,
  role: 'teacher' | 'editor',
  action: 'add' | 'remove',
) {
  const existing = await db
    .select()
    .from(schema.userCourses)
    .where(
      and(
        eq(schema.userCourses.courseId, courseId),
        eq(schema.userCourses.userId, userId),
        isNull(schema.userCourses.deletedAt),
      ),
    )
    .limit(1)

  const isFlag = role === 'teacher' ? 'isTeacher' : 'isEditor'
  const flagValue = action === 'add'

  if (existing[0]) {
    await db
      .update(schema.userCourses)
      .set({ [isFlag]: flagValue } as any)
      .where(
        and(
          eq(schema.userCourses.courseId, courseId),
          eq(schema.userCourses.userId, userId),
        ),
      )
  } else if (action === 'add') {
    await db
      .insert(schema.userCourses)
      .values({
        courseId,
        userId,
        isTeacher: role === 'teacher',
        isEditor: role === 'editor',
      })
  }
}
