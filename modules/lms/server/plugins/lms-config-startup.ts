/**
 * 服务启动时加载 lms_config 到内存缓存
 * 并在首次启动时初始化 1 个 test 班级 + 30 个 test 学生账号
 *   - 若 classes 表为空，则新建 class(name='test', code='test', id=1)
 *   - 所有 test01~test30 账号的 class_id 都设为 1（写入 userClasses）
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { hashPassword } from "../../../base/server/utils/auth"
import { reloadLmsConfig, getLmsConfig } from "../../../base/server/utils/lmsConfig"

const TEST_PASSWORD = 'REDACTED'
const TEST_COUNT = 30
const TEST_CLASS_NAME = 'test'
const TEST_CLASS_CODE = 'test'

export default defineNitroPlugin(async () => {
  await reloadLmsConfig()

  // 首次启动时初始化 test 班级 + 30 个 test 账号（仅一次，写入 lms_config 标记位）
  try {
    const cfg = getLmsConfig() as any
    if (cfg.testAccountsSeeded) {
      return
    }

    // 1. 查询 student 角色（admin 启动插件会先创建）
    const studentRoleRows = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.code, 'student'))
      .limit(1)

    if (studentRoleRows.length === 0) {
      console.warn('[lms-config-startup] student 角色不存在，跳过 test 账号初始化（admin 启动插件会创建）')
      return
    }
    const studentRoleId = studentRoleRows[0].id

    // 2. 处理 test 班级：若 classes 表为空则创建一个 id=1 的班级
    const existingClasses = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .limit(1)

    if (existingClasses.length === 0) {
      // 让数据库自增 id=1（首次插入 serial 主键必为 1）
      await db
        .insert(schema.classes)
        .values({ name: TEST_CLASS_NAME, code: TEST_CLASS_CODE })
      console.log(`[lms-config-startup] 已创建 test 班级（id=1）`)
    } else {
      console.log(`[lms-config-startup] classes 表已存在 ${existingClasses[0].id} 等班级，跳过创建`)
    }

    // 3. 创建 30 个 test 学生账号
    const hashedPwd = await hashPassword(TEST_PASSWORD)
    const now = new Date()
    const userInserts: any[] = []
    const roleInserts: any[] = []
    const classInserts: any[] = []

    for (let i = 1; i <= TEST_COUNT; i++) {
      const num = String(i).padStart(2, '0')
      const rollNumber = `test${num}`
      userInserts.push({
        username: rollNumber,
        password: hashedPwd,
        name: `Test Student ${num}`,
        preferName: `Test${num}`,
        englishName: `Test${num}`,
        gender: i % 2 === 0 ? 'female' : 'male',
        email: `${rollNumber}@university.edu.cn`,
        rollNumber,
        strongPwd: true,
        defaultLocale: 'en',
        avatarImg: '/avatar.webp',
        createdAt: now,
        updatedAt: now,
      })
    }

    // 批量插入用户
    const insertedUsers = await db
      .insert(schema.users)
      .values(userInserts)
      .onConflictDoNothing()
      .returning({ id: schema.users.id, username: schema.users.username })

    // 为成功插入的用户关联 student 角色 + class_id=1
    for (const u of insertedUsers) {
      roleInserts.push({ userId: u.id, roleId: studentRoleId })
      classInserts.push({ userId: u.id, classId: 1 })
    }
    if (roleInserts.length) {
      await db.insert(schema.userRoles).values(roleInserts).onConflictDoNothing()
    }
    if (classInserts.length) {
      await db.insert(schema.userClasses).values(classInserts).onConflictDoNothing()
    }

    // 4. 写入标记位到 lms_config，避免重复初始化
    await db.update(schema.configs)
      .set({ value: { ...cfg, testAccountsSeeded: true } })
      .where(eq(schema.configs.id, 'lms_config'))

    console.log(`[lms-config-startup] 已初始化 ${insertedUsers.length}/${TEST_COUNT} 个 test 账号（密码: ${TEST_PASSWORD}，全部归属 class_id=1）`)
  } catch (e) {
    console.error('[lms-config-startup] test 账号初始化失败', e)
  }
})
