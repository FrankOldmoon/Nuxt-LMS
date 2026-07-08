/**
 * 服务启动时加载 lms_config 到内存缓存
 * 并在首次启动时初始化 30 个 test 学生账号
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { hashPassword } from "../../../base/server/utils/auth"
import { reloadLmsConfig, getLmsConfig } from "../../../base/server/utils/lmsConfig"

const TEST_PASSWORD = 'REDACTED'
const TEST_COUNT = 30

export default defineNitroPlugin(async () => {
  await reloadLmsConfig()

  // 首次启动时初始化 30 个 test 账号（仅一次，写入 lms_config 标记位）
  try {
    const cfg = getLmsConfig() as any
    if (cfg.testAccountsSeeded) {
      return
    }

    // 查询 student 角色（admin 启动插件会先创建）
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

    const hashedPwd = await hashPassword(TEST_PASSWORD)
    const now = new Date()
    const userInserts: any[] = []
    const roleInserts: any[] = []

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

    // 为成功插入的用户关联 student 角色
    for (const u of insertedUsers) {
      roleInserts.push({ userId: u.id, roleId: studentRoleId })
    }
    if (roleInserts.length) {
      await db.insert(schema.userRoles).values(roleInserts).onConflictDoNothing()
    }

    // 写入标记位到 lms_config，避免重复初始化
    await db.update(schema.configs)
      .set({ value: { ...cfg, testAccountsSeeded: true } })
      .where(eq(schema.configs.id, 'lms_config'))

    console.log(`[lms-config-startup] 已初始化 ${insertedUsers.length}/${TEST_COUNT} 个 test 账号（密码: ${TEST_PASSWORD}）`)
  } catch (e) {
    console.error('[lms-config-startup] test 账号初始化失败', e)
  }
})
