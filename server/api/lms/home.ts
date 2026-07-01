import { db, schema } from "@nuxthub/db";
import { asc } from "drizzle-orm";

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

  return cResp({
    categories: categories.map(normalizeCategory),
    courses: courses.map((c) => normalizeCourseSummary(c, c.chapters.length)),
  });
});
