import { db, schema } from "@nuxthub/db";
import { asc, eq, and, isNull, sql, inArray, or, ne } from "drizzle-orm";

export default eventHandler(async (event) => {
  // 当前登录用户（可选登录）；用于课程可见性控制
  const user = await getCurrentUser(event)
  const isAdmin = !!user?.roles.includes('admin')

  // 查询所有分类（按 order 排序）
  const categories = await db.query.categories.findMany({
    orderBy: [asc(schema.categories.order)],
  });

  // 查询课程（按状态过滤 + 带章节关系，用于计算章节数）
  // 可见性：归档(archived) 所有角色均不展示；草稿(draft) 仅管理员可见；已发布(published) 全员可见
  // 课程排序由分类的 orders 字段控制，前端按 category.orders 排序
  const courses = await db.query.courses.findMany({
    where: isAdmin
      ? and(isNull(schema.courses.deletedAt), ne(schema.courses.status, 'archived'))
      : and(isNull(schema.courses.deletedAt), eq(schema.courses.status, 'published')),
    with: { chapters: true },
  });

  // 查询所有课程的教师/编辑者
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
          avatarFrame: schema.users.avatarFrame,
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
      avatarFrame: m.avatarFrame,
      isTeacher: !!m.isTeacher,
      isEditor: !!m.isEditor,
    })
  }

  // 查询网站配置
  const siteConfig = await db.query.configs.findFirst({
    where: eq(schema.configs.id, 'site_config'),
  });

  // 未读计数（登录用户才有意义，未登录返回 0）
  let notifyUnread = 0
  let msgUnread = 0
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
