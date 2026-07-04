import { db, schema } from "@nuxthub/db";
import { asc, eq, and, isNull, sql } from "drizzle-orm";

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
    courses: courses.map((c) => normalizeCourseSummary(c, c.chapters.length)),
    config: siteConfig?.value ?? null,
    notifyUnread,
    msgUnread,
  });
});
