/**
 * 服务启动时加载 site_config 到内存缓存，并初始化默认值
 * 同时检查并创建默认 admin 账号
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { DEFAULT_SITE_CONFIG, reloadSiteConfig } from "../utils/siteConfig"
import { hashPassword, generateToken } from "../utils/auth"

// 固定 admin 账号配置
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'REDACTED'

export default defineNitroPlugin(async () => {
  // 若 site_config 不存在则插入默认值
  try {
    const row = await db.query.configs.findFirst({
      where: eq(schema.configs.id, 'site_config'),
    })
    if (!row) {
      await db.insert(schema.configs).values({
        id: 'site_config',
        value: DEFAULT_SITE_CONFIG,
      })
      console.log('[site_config] 已初始化默认配置')
    }
  } catch (e) {
    console.error('[site_config] 初始化失败', e)
  }
  await reloadSiteConfig()

  // 检查并创建默认 admin 账号
  try {
    // 查询是否存在 admin 用户
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
        // 创建基础权限
        const permData = [
          { name: '查看课程', code: 'course:read' },
          { name: '编辑课程', code: 'course:write' },
          { name: '管理用户', code: 'user:manage' },
          { name: '发布公告', code: 'announce:write' },
        ]
        await db.insert(schema.permissions).values(permData).onConflictDoNothing()
        const permissions = await db.select().from(schema.permissions)

        // 创建基础角色
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
          teacher: permissions.filter(p => ['course:read', 'course:write', 'announce:write'].includes(p.code)).map(p => p.id),
          student: permissions.filter(p => p.code === 'course:read').map(p => p.id),
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
          .returning({ id: schema.users.id });

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
            name: '系统管理员',
            preferName: 'Admin',
            englishName: 'Admin',
            gender: 'male',
            email: 'admin@university.edu.cn',
            strongPwd: true,
            defaultLocale: 'zh-CN',
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
