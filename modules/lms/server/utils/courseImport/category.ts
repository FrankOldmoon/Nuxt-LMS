/**
 * 课程导入：创建分类 + 创建课程
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { ExportedCourse } from './types'

/**
 * 创建或复用分类
 * @param overrideCategoryId 指定 categoryId 时直接复用，否则以课程名新建
 * @returns categoryId
 */
export async function resolveCategory(
  tx: typeof db,
  course: ExportedCourse,
  overrideCategoryId?: number,
): Promise<number> {
  if (overrideCategoryId) {
    const cat = await tx.query.categories.findFirst({
      where: eq(schema.categories.id, overrideCategoryId),
    })
    if (!cat) throw new Error('指定的分类不存在')
    return overrideCategoryId
  }
  const [newCategory] = await tx.insert(schema.categories).values({
    name: course.name,
    code: course.code || null,
    orders: [],
  }).returning()
  if (!newCategory) throw new Error('分类创建失败')
  return newCategory.id
}

/**
 * 创建课程（orders 先写空数组，待章节插入完再回填）
 */
export async function createCourse(
  tx: typeof db,
  course: ExportedCourse,
  categoryId: number,
): Promise<number> {
  const [newCourse] = await tx.insert(schema.courses).values({
    name: course.name,
    code: course.code || null,
    categoryId,
    content: course.content || { content: {}, type: 'doc' },
    orders: [],
    gradeCriteria: course.gradeCriteria || null,
    tags: course.tags || [],
    config: course.config || null,
  }).returning()
  if (!newCourse) throw new Error('课程创建失败')
  return newCourse.id
}
