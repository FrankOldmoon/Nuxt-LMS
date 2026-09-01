import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

// 自然排序：先按名称开头的数字升序（2V 排在 10V 之前），数字相同再按后缀字母排序
function compareByName(a: string, b: string): number {
  const re = /^(\d*)(.*)$/
  const am = re.exec(a)
  const bm = re.exec(b)
  const an = am![1] === '' ? 0 : parseInt(am![1], 10)
  const bn = bm![1] === '' ? 0 : parseInt(bm![1], 10)
  if (an !== bn) return an - bn
  return am![2].localeCompare(bm![2])
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const cols = { id: schema.classes.id, name: schema.classes.name, code: schema.classes.code }
  const sortByName = (rows: { name: string }[]) =>
    rows.slice().sort((x, y) => compareByName(x.name, y.name))

  // admin 返回所有班级
  if (user.roles.includes('admin')) {
    const data = await db
      .select(cols)
      .from(schema.classes)
      .where(isNull(schema.classes.deletedAt))
      .orderBy(schema.classes.id)
    return cResp(sortByName(data))
  }

  // 非 admin 只返回 user_classes 中 is_teacher=true 的班级
  const data = await db
    .select(cols)
    .from(schema.userClasses)
    .innerJoin(schema.classes, eq(schema.userClasses.classId, schema.classes.id))
    .where(and(
      eq(schema.userClasses.userId, user.id),
      eq(schema.userClasses.isTeacher, true),
      isNull(schema.classes.deletedAt),
    ))
    .orderBy(schema.classes.id)

  return cResp(sortByName(data))
})
