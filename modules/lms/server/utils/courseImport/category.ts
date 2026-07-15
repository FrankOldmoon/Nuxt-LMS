/**
 * Course import: create category + create course
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { ExportedCourse } from './types'

/**
 * Create or reuse a category
 * @param overrideCategoryId When categoryId is specified, reuse it directly; otherwise create a new one named after the course
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
    if (!cat) throw new Error('Specified category does not exist')
    return overrideCategoryId
  }
  const [newCategory] = await tx.insert(schema.categories).values({
    name: course.name,
    code: course.code || null,
    orders: [],
  }).returning()
  if (!newCategory) throw new Error('Category creation failed')
  return newCategory.id
}

/**
 * Create a course (orders is written as an empty array first, backfilled after chapters are inserted)
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
  if (!newCourse) throw new Error('Course creation failed')
  return newCourse.id
}
