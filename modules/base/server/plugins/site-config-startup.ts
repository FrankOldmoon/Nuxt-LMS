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
        ]
        await db.insert(schema.roles).values(roleData).onConflictDoNothing()
        const roles = await db.select().from(schema.roles)

        // 关联角色权限
        const rolePermMap: Record<string, number[]> = {
          admin: permissions.map(p => p.id),
          teacher: permissions.filter(p => ['announce:write', 'file:manage'].includes(p.code)).map(p => p.id),
          student: [],
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
})
