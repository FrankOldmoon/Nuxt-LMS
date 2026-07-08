import { db, schema } from "@nuxthub/db";
import { asc, eq, and, isNull, sql, inArray, or } from "drizzle-orm";

/**
 * 首页数据 API（lms 覆盖版）
 *
 * 覆盖机制（与 chapters/show.get.ts 相同）：
 * - 文件名：lms 用 `home.get.ts`（method=GET），doc 也用 `home.get.ts`（method=GET）
 *   → 必须 method 相同，否则 hook 倒序去重不会合并
 * - 实际生效靠 lms/index.ts 的 nitro:config hook：
 *   Nitro 的 nitroConfig.handlers 是 push 累加的，h3 router 匹配时取第一个命中的 handler。
 *   lms 在 doc 之后 addServerScanDir，所以 lms 的 handler 排在 doc 之后（数组末位），
 *   h3 永远先命中 doc 的 handler。hook 倒序去重保留后注册者（lms），让 h3 命中 lms。
 *
 * 不要把 lms 文件改名为 `home.ts`（method=ALL）：
 * - ALL 不会被去重（method 字段不同），doc 的 GET 仍然先被命中，覆盖失败
 * - /api/home 实际上只接受 GET 请求（首页数据获取），不需要 ALL
 */
export default eventHandler(async (event) => {
  // 查询所有分类（按 order 排序）
  const categories = await db.query.categories.findMany({
    orderBy: [asc(schema.categories.order)],
  });

  // 查询所有课程（带章节关系，用于计算章节数）
  // 课程排序由分类的 orders 字段控制，前端按 category.orders 排序
  const courses = await db.query.courses.findMany({
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

  // 查询网站配置
  const siteConfig = await db.query.configs.findFirst({
    where: eq(schema.configs.id, 'site_config'),
  });

  // 未读计数（登录用户才有意义，未登录返回 0）
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
