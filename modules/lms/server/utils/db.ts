/**
 * lms 模块数据库工具扩展
 *
 * 仅提供 lms 特有的内容版本/课程成员/班级用户功能。
 * 基础功能（validateTable/listTable/showTable/addTable/updateTable/batchTable/assignRoleToUser/searchUsers/upsertConfig）
 * 由 base 模块提供，Nuxt auto-import 自动扫描，无需在此重导出。
 */

import { showTable, updateTable } from '../../../base/server/utils/db'
import { db, schema } from "@nuxthub/db"
import { eq, inArray, desc, and, isNull, or, ilike } from "drizzle-orm"

// ====================== 内容版本快照 ======================

/**
 * 保存内容版本快照，并只保留最新的 maxKeep 条
 * 在更新 courses/chapters 的 content 之前调用，记录旧内容以便恢复
 */
export async function saveContentVersion(
  type: 'course' | 'chapter',
  id: number,
  content: any,
  maxKeep = 10,
) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const fk = type === 'course' ? schema.courseVersions.courseId : schema.chapterVersions.chapterId

  // 插入旧内容快照
  await db.insert(table).values(
    type === 'course'
      ? { courseId: id, content }
      : { chapterId: id, content },
  )

  // 按 id 倒序保留最新 maxKeep 条，删除更早的版本
  const all = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(fk, id))
    .orderBy(desc(table.id))

  if (all.length > maxKeep) {
    const idsToDelete = all.slice(maxKeep).map((r) => r.id)
    await db.delete(table).where(inArray(table.id, idsToDelete))
  }
}

// ====================== 内容版本查询/恢复 ======================

/**
 * 获取内容的历史版本列表（按 id 倒序）
 */
export async function listContentVersions(type: 'course' | 'chapter', id: number) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const fk = type === 'course' ? schema.courseVersions.courseId : schema.chapterVersions.chapterId

  return db
    .select({
      id: table.id,
      content: table.content,
      createdAt: table.createdAt,
    })
    .from(table)
    .where(eq(fk, id))
    .orderBy(desc(table.id))
}

/**
 * 按 versionId 获取单个版本记录
 */
export async function getContentVersion(type: 'course' | 'chapter', versionId: number) {
  const table = type === 'course' ? schema.courseVersions : schema.chapterVersions
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.id, versionId))
    .limit(1)
  return rows[0] ?? null
}

/**
 * 恢复内容到指定版本
 * 先将当前内容保存为版本快照，再写回历史版本内容
 */
export async function restoreContentVersion(type: 'course' | 'chapter', id: number, content: any) {
  const tableName = type === 'course' ? 'courses' : 'chapters'
  const current = await showTable(tableName, id)
  const oldContent = (current as any)?.content
  if (oldContent !== undefined && oldContent !== null) {
    await saveContentVersion(type, id, oldContent)
  }
  await updateTable(tableName, id, { content })
}

// ====================== 课程成员管理 ======================

/**
 * 获取课程的教师和编辑者列表
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
 * 添加或移除课程的教师/编辑者
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

// ====================== 班级用户查询 ======================

/**
 * 获取指定班级的用户列表（user_classes 关联表 + users.class_id 直接归属）
 * 合并去重：关联表用户优先（有 isTeacher 信息），补充直接归属用户
 */
export async function getClassUsers(classId: number, courseId: number = 0) {
  // 1. 通过 user_classes 关联表查询（含 isTeacher 信息）
  const relUsers = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      preferName: schema.users.preferName,
      englishName: schema.users.englishName,
      avatarImg: schema.users.avatarImg,
      rollNumber: schema.users.rollNumber,
      email: schema.users.email,
      telephone: schema.users.telephone,
      loginAt: schema.users.loginAt,
      isTeacher: schema.userClasses.isTeacher,
    })
    .from(schema.userClasses)
    .innerJoin(schema.users, eq(schema.userClasses.userId, schema.users.id))
    .where(
      and(
        eq(schema.userClasses.classId, classId),
        isNull(schema.userClasses.deletedAt),
        isNull(schema.users.deletedAt),
      ),
    )

  // 2. 通过 users.class_id 直接归属查询（未在 user_classes 中的）
  const relUserIds = new Set(relUsers.map((u) => u.id))
  const directUsers = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      preferName: schema.users.preferName,
      englishName: schema.users.englishName,
      avatarImg: schema.users.avatarImg,
      rollNumber: schema.users.rollNumber,
      email: schema.users.email,
      telephone: schema.users.telephone,
      loginAt: schema.users.loginAt,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.classId, classId),
        isNull(schema.users.deletedAt),
      ),
    )

  // 3. 合并去重
  const merged = [...relUsers]
  for (const u of directUsers) {
    if (!relUserIds.has(u.id)) {
      merged.push({ ...u, isTeacher: null })
    }
  }

  // 4. 如果有 courseId，查询 userCourses 的 number 和 group 并合并
  if (courseId && merged.length > 0) {
    const userIds = merged.map(u => u.id)
    const userCourses = await db.query.userCourses.findMany({
      where: and(
        eq(schema.userCourses.courseId, courseId),
        inArray(schema.userCourses.userId, userIds),
      ),
    })
    const ucMap = new Map(userCourses.map(uc => [uc.userId, uc]))
    for (const u of merged) {
      const uc = ucMap.get(u.id)
      ;(u as any).number = uc?.number || ''
      ;(u as any).group = uc?.group || ''
    }
  }

  return merged
}
