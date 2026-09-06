/**
 * 服务启动时：
 * 1. 把 DEFAULT_SITE_CONFIG 每个 key 拍平播种为 configs 表独立行（不存在才插入）
 * 2. 加载配置到内存缓存
 * 3. 检查并创建默认 admin 账号 + 基础角色/权限
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { DEFAULT_SITE_CONFIG } from "../utils/config/defaults"
import { reloadConfig } from "../utils/config/reload"
import { hashPassword } from "../utils/auth"

// 固定 admin 账号配置
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'REDACTED'

// 固定 observer（只读观察者）账号配置
const OBSERVER_USERNAME = 'observer'
const OBSERVER_PASSWORD = 'REDACTED'
const OBSERVER_CLASS = 'observer'

// 固定测试账号配置：test01 ~ test30，班级 test
const TEST_ACCOUNT_COUNT = 30
const TEST_CLASS = 'test'
const TEST_PASSWORD = 'REDACTED'

export default defineNitroPlugin(async () => {
  // 1. 拍平播种：每个 site:* key 独立一行
  try {
    for (const [key, defaultValue] of Object.entries(DEFAULT_SITE_CONFIG)) {
      const existing = await db.query.configs.findFirst({
        where: eq(schema.configs.id, key),
      })
      if (!existing) {
        await db.insert(schema.configs).values({
          id: key,
          value: defaultValue,
        })
      }
    }
    console.log('[startup] site 配置已初始化（拍平键值）')
  } catch (e) {
    console.error('[startup] site 配置初始化失败', e)
  }

  // 2. 加载到内存缓存
  await reloadConfig()

  // 3. 检查并创建默认 admin 账号
  try {
    const existingAdmin = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, ADMIN_USERNAME))
      .limit(1)

    if (existingAdmin.length === 0) {
      // 查询 admin 角色
      const adminRole = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.code, 'admin'))
        .limit(1)

      // 若 admin 角色不存在，先创建角色和权限
      if (adminRole.length === 0) {
        // base 通用权限（lms/doc 各自的权限由各模块 startup 自行添加）
        const permData = [
          { name: '管理用户', code: 'user:manage' },
          { name: '管理配置', code: 'config:manage' },
          { name: '管理文件', code: 'file:manage' },
          { name: '发布公告', code: 'announce:write' },
        ]
        await db.insert(schema.permissions).values(permData).onConflictDoNothing()
        const permissions = await db.select().from(schema.permissions)

        // 基础角色
        const roleData = [
          { name: '管理员', code: 'admin' },
          { name: '教师', code: 'teacher' },
          { name: '学生', code: 'student' },
          { name: '观察者', code: 'observer' },
        ]
        await db.insert(schema.roles).values(roleData).onConflictDoNothing()
        const roles = await db.select().from(schema.roles)

        // 关联角色权限
        const rolePermMap: Record<string, number[]> = {
          admin: permissions.map(p => p.id),
          teacher: permissions.filter(p => ['announce:write', 'file:manage'].includes(p.code)).map(p => p.id),
          student: [],
          observer: [],
        }
        const rolePermInserts: { roleId: number; permissionId: number }[] = []
        for (const role of roles) {
          const permIds = rolePermMap[role.code]
          if (permIds?.length) {
            permIds.forEach(permissionId => rolePermInserts.push({ roleId: role.id, permissionId }))
          }
        }
        if (rolePermInserts.length) {
          await db.insert(schema.rolePermissions).values(rolePermInserts).onConflictDoNothing()
        }
        console.log('[startup] 已初始化基础角色和权限')

        // 重新查询 admin 角色
        const [newAdminRole] = await db
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.code, 'admin'))
          .limit(1)

        if (!newAdminRole) {
          console.error('[startup] admin 角色创建失败')
          return
        }

        // 创建 admin 用户
        const hashedPwd = await hashPassword(ADMIN_PASSWORD)
        const [adminUser] = await db
          .insert(schema.users)
          .values({
            username: ADMIN_USERNAME,
            password: hashedPwd,
            name: "Admin",
            preferName: "Admin",
            englishName: "Admin",
            gender: "male",
            email: "admin@university.edu.cn",
            strongPwd: true,
            defaultLocale: "en",
            avatarImg: "/avatar.webp",
          })
          .returning({ id: schema.users.id })

        // 关联 admin 角色
        await db.insert(schema.userRoles).values({
          userId: adminUser.id,
          roleId: newAdminRole.id,
        }).onConflictDoNothing()

        console.log(`[startup] 已创建默认 admin 账号 (用户名: ${ADMIN_USERNAME}, 密码: ${ADMIN_PASSWORD})`)
      } else {
        // admin 角色已存在，直接创建用户
        const hashedPwd = await hashPassword(ADMIN_PASSWORD)
        const [adminUser] = await db
          .insert(schema.users)
          .values({
            username: ADMIN_USERNAME,
            password: hashedPwd,
            name: 'Admin',
            preferName: 'Admin',
            englishName: 'Admin',
            gender: 'male',
            email: 'admin@university.edu.cn',
            strongPwd: true,
            defaultLocale: 'en',
            avatarImg: '/avatar.webp',
          })
          .returning({ id: schema.users.id })

        // 关联 admin 角色
        await db.insert(schema.userRoles).values({
          userId: adminUser.id,
          roleId: adminRole[0].id,
        }).onConflictDoNothing()

        console.log(`[startup] 已创建默认 admin 账号 (用户名: ${ADMIN_USERNAME}, 密码: ${ADMIN_PASSWORD})`)
      }
    } else {
      console.log('[startup] admin 账号已存在，跳过创建')
    }
  } catch (e) {
    console.error('[startup] admin 账号初始化失败', e)
  }

  // 4. 创建默认 observer（只读观察者）：角色 + 班级 + 账号（全程幂等）
  try {
    // 4.1 确保 observer 角色存在
    const observerRoleRows = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.code, 'observer'))
      .limit(1)
    let observerRoleId = observerRoleRows[0]?.id
    if (!observerRoleId) {
      await db.insert(schema.roles).values({ name: '观察者', code: 'observer' }).onConflictDoNothing()
      observerRoleId = (await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.code, 'observer'))
        .limit(1))[0]?.id
    }
    if (!observerRoleId) {
      console.error('[startup] observer 角色创建失败')
      return
    }

    // 4.2 确保 observer 班级存在
    const observerClassRows = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .where(eq(schema.classes.code, OBSERVER_CLASS))
      .limit(1)
    let observerClassId = observerClassRows[0]?.id
    if (!observerClassId) {
      await db.insert(schema.classes).values({ name: OBSERVER_CLASS, code: OBSERVER_CLASS }).onConflictDoNothing()
      observerClassId = (await db
        .select({ id: schema.classes.id })
        .from(schema.classes)
        .where(eq(schema.classes.code, OBSERVER_CLASS))
        .limit(1))[0]?.id
    }

    // 4.3 创建 observer 账号（不存在才创建）
    const observerUser = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, OBSERVER_USERNAME))
      .limit(1)
    let observerUserId: number | undefined = observerUser[0]?.id
    if (!observerUserId) {
      const hashedPwd = await hashPassword(OBSERVER_PASSWORD)
      await db.insert(schema.users).values({
        username: OBSERVER_USERNAME,
        password: hashedPwd,
        name: 'Observer',
        preferName: 'Observer',
        englishName: 'Observer',
        gender: 'other',
        email: 'observer@university.edu.cn',
        strongPwd: true,
        defaultLocale: 'zh-CN',
        avatarImg: '/avatar.webp',
        classId: observerClassId ?? null,
      }).onConflictDoNothing()
      observerUserId = (await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, OBSERVER_USERNAME))
        .limit(1))[0]?.id
    }

    if (!observerUserId) {
      console.error('[startup] observer 账号创建失败')
      return
    }

    // 绑定 observer 角色 + 加入 observer 班级（幂等）
    await db.insert(schema.userRoles).values({ userId: observerUserId, roleId: observerRoleId }).onConflictDoNothing()
    if (observerClassId) {
      await db.insert(schema.userClasses).values({ userId: observerUserId, classId: observerClassId, isTeacher: false }).onConflictDoNothing()
    }

    console.log(`[startup] observer 账号就绪 (用户名: ${OBSERVER_USERNAME}, 密码: ${OBSERVER_PASSWORD}, 班级: ${OBSERVER_CLASS})`)
  } catch (e) {
    console.error('[startup] observer 初始化失败', e)
  }

  // 5. 初始化 30 个测试账号（test01 ~ test30）：学生角色 + 班级 test（全程幂等）
  try {
    // 5.1 确保 test 班级存在
    const testClassRows = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .where(eq(schema.classes.code, TEST_CLASS))
      .limit(1)
    let testClassId = testClassRows[0]?.id
    if (!testClassId) {
      await db.insert(schema.classes).values({ name: TEST_CLASS, code: TEST_CLASS }).onConflictDoNothing()
      testClassId = (await db
        .select({ id: schema.classes.id })
        .from(schema.classes)
        .where(eq(schema.classes.code, TEST_CLASS))
        .limit(1))[0]?.id
    }

    // 5.2 确保 student 角色存在
    const studentRoleRows = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.code, 'student'))
      .limit(1)
    let studentRoleId = studentRoleRows[0]?.id
    if (!studentRoleId) {
      await db.insert(schema.roles).values({ name: '学生', code: 'student' }).onConflictDoNothing()
      studentRoleId = (await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.code, 'student'))
        .limit(1))[0]?.id
    }

    if (!testClassId || !studentRoleId) {
      console.error('[startup] test 班级或 student 角色创建失败')
      return
    }

    // 5.3 逐个创建 test01 ~ test30 账号（不存在才创建）
    const hashedPwd = await hashPassword(TEST_PASSWORD)
    let created = 0
    for (let i = 1; i <= TEST_ACCOUNT_COUNT; i++) {
      const username = `test${String(i).padStart(2, '0')}`

      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1)
      if (existing.length > 0) continue

      await db.insert(schema.users).values({
        username,
        password: hashedPwd,
        name: username,
        preferName: username,
        englishName: username,
        gender: 'other',
        email: `${username}@university.edu.cn`,
        strongPwd: false,
        defaultLocale: 'zh-CN',
        avatarImg: '/avatar.webp',
        classId: testClassId,
      }).onConflictDoNothing()

      const [newUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1)
      if (!newUser) continue

      // 绑定 student 角色 + 加入 test 班级（幂等）
      await db.insert(schema.userRoles).values({ userId: newUser.id, roleId: studentRoleId }).onConflictDoNothing()
      await db.insert(schema.userClasses).values({ userId: newUser.id, classId: testClassId, isTeacher: false }).onConflictDoNothing()
      created++
    }

    console.log(`[startup] test 测试账号就绪 (test01 ~ test${String(TEST_ACCOUNT_COUNT).padStart(2, '0')}, 本次新建 ${created} 个, 密码: ${TEST_PASSWORD}, 班级: ${TEST_CLASS})`)
  } catch (e) {
    console.error('[startup] test 测试账号初始化失败', e)
  }
})
