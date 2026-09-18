import { db, schema } from '@nuxthub/db'
import { asc, eq, and, isNull, sql, inArray, ne, or } from 'drizzle-orm'

/**
 * 首页聚合数据：分类 + 课程（含章节数、教师）+ 站点配置
 *
 * 抽出为函数，供两个入口复用：
 * - GET /api/home（单独拉取，向后兼容）
 * - GET /api/bootstrap（与站点配置 / LMS 公开配置合并成一次首屏请求）
 *
 * 性能要点：
 * - 章节数改用 `count(*) GROUP BY course_id` 聚合，不再 `with: { chapters: true }`
 *   把每门课的章节行（含大字段 content）全量拉回来只为取 length
 * - 未读通知/消息计数不在此处计算（由 /api/notifications/unread 统一提供，避免重复查询）
 */
export async function getHomeData(event: any) {
  // 当前登录用户（可选登录）；用于课程可见性控制
  const user = await getCurrentUser(event)
  const isAdmin = !!user?.roles.includes('admin')

  // 分类 / 课程 / 站点配置：三个互不依赖的查询并发执行
  const [categories, courses, siteConfig] = await Promise.all([
    db.query.categories.findMany({
      orderBy: [asc(schema.categories.order)],
    }),
    // 可见性：归档(archived) 所有角色均不展示；草稿(draft) 仅管理员可见；已发布(published) 全员可见
    db.query.courses.findMany({
      where: isAdmin
        ? and(isNull(schema.courses.deletedAt), ne(schema.courses.status, 'archived'))
        : and(isNull(schema.courses.deletedAt), eq(schema.courses.status, 'published')),
    }),
    db.query.configs.findFirst({
      where: eq(schema.configs.id, 'site_config'),
    }),
  ])

  const courseIds = courses.map(c => c.id)

  // 章节数聚合 + 课程教师/编辑者：都依赖 courseIds，故并发执行
  let chapterCountRows: any[] = []
  let allMembers: any[] = []
  if (courseIds.length > 0) {
    ;[chapterCountRows, allMembers] = await Promise.all([
      db
        .select({
          courseId: schema.chapters.courseId,
          count: sql`count(*)`.as('count'),
        })
        .from(schema.chapters)
        .where(inArray(schema.chapters.courseId, courseIds))
        .groupBy(schema.chapters.courseId),
      db
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
        )),
    ])
  }

  const chapterCountMap = new Map<number, number>()
  for (const r of chapterCountRows) {
    chapterCountMap.set(Number(r.courseId), Number(r.count) || 0)
  }

  const teacherMap = new Map<number, any[]>()
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

  return {
    categories: categories.map(normalizeCategory),
    courses: courses.map((c) =>
      normalizeCourseSummary(c, chapterCountMap.get(c.id) || 0, teacherMap.get(c.id) || [])),
    config: siteConfig?.value ?? null,
  }
}
