import { db, schema } from "@nuxthub/db";
import { asc, eq, and, isNull, sql, inArray, or } from "drizzle-orm";

export default eventHandler(async (event) => {
  // Query all categories (ordered by order)
  const categories = await db.query.categories.findMany({
    orderBy: [asc(schema.categories.order)],
  });

  // Query all courses (with chapter relation, used to count chapters)
  // Course ordering is controlled by the category's orders field; the frontend sorts by category.orders
  const courses = await db.query.courses.findMany({
    with: { chapters: true },
  });

  // Query teachers/editors for all courses
  const courseIds = courses.map(c => c.id)
  const allMembers = courseIds.length > 0
    ? await db
        .select({
          courseId: schema.userCourses.courseId,
          userId: schema.userCourses.userId,
          isTeacher: schema.userCourses.isTeacher,
          isEditor: schema.userCourses.isEditor,
          username: schema.users.username,
          name: schema.users.name,
          avatarImg: schema.users.avatarImg,
        })
        .from(schema.userCourses)
        .innerJoin(schema.users, eq(schema.userCourses.userId, schema.users.id))
        .where(and(
          inArray(schema.userCourses.courseId, courseIds),
          isNull(schema.userCourses.deletedAt),
          or(
            eq(schema.userCourses.isTeacher, true),
            eq(schema.userCourses.isEditor, true),
          ),
        ))
    : []
  const teacherMap = new Map<number, LmsMember[]>()
  for (const m of allMembers) {
    if (!teacherMap.has(m.courseId)) teacherMap.set(m.courseId, [])
    teacherMap.get(m.courseId)!.push({
      userId: m.userId,
      username: m.username,
      name: m.name,
      avatarImg: m.avatarImg,
      isTeacher: !!m.isTeacher,
      isEditor: !!m.isEditor,
    })
  }

  // Query site configuration
  const siteConfig = await db.query.configs.findFirst({
    where: eq(schema.configs.id, 'site_config'),
  });

  // Unread count (only meaningful for logged-in users; returns 0 for guests)
  let notifyUnread = 0
  let msgUnread = 0
  const user = await getCurrentUser(event)
  if (user) {
    const [notifyRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.notifys)
      .where(and(eq(schema.notifys.userId, user.id), isNull(schema.notifys.readAt)))
    notifyUnread = Number(notifyRow?.count) || 0

    const [msgRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.messages)
      .where(and(
        eq(schema.messages.receiverUserId, user.id),
        isNull(schema.messages.readAt),
        isNull(schema.messages.deletedAt),
      ))
    msgUnread = Number(msgRow?.count) || 0
  }

  return cResp({
    categories: categories.map(normalizeCategory),
    courses: courses.map((c) => normalizeCourseSummary(c, c.chapters.length, teacherMap.get(c.id) || [])),
    config: siteConfig?.value ?? null,
    notifyUnread,
    msgUnread,
  });
});
