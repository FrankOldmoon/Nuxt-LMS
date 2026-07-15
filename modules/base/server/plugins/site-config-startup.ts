/**
 * On server startup:
 * 1. Seed each key of DEFAULT_SITE_CONFIG as an independent row in the configs table (insert only if not exists)
 * 2. Load config into in-memory cache
 * 3. Check and create default admin account + base roles/permissions
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { DEFAULT_SITE_CONFIG } from "../utils/config/defaults"
import { reloadConfig } from "../utils/config/reload"
import { hashPassword } from "../utils/auth"

// Fixed admin account config
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'REDACTED'

export default defineNitroPlugin(async () => {
  // 1. Flattened seeding: each site:* key as an independent row
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
    console.log('[startup] site config initialized (flattened key-values)')
  } catch (e) {
    console.error('[startup] site config initialization failed', e)
  }

  // 2. Load into in-memory cache
  await reloadConfig()

  // 3. Check and create default admin account
  try {
    const existingAdmin = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, ADMIN_USERNAME))
      .limit(1)

    if (existingAdmin.length === 0) {
      // Query admin role
      const adminRole = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.code, 'admin'))
        .limit(1)

      // If admin role does not exist, create roles and permissions first
      if (adminRole.length === 0) {
        // base common permissions (lms/doc permissions are added by each module's own startup)
        const permData = [
          { name: 'Manage Users', code: 'user:manage' },
          { name: 'Manage Config', code: 'config:manage' },
          { name: 'Manage Files', code: 'file:manage' },
          { name: 'Publish Announcements', code: 'announce:write' },
        ]
        await db.insert(schema.permissions).values(permData).onConflictDoNothing()
        const permissions = await db.select().from(schema.permissions)

        // Base roles
        const roleData = [
          { name: 'Administrator', code: 'admin' },
          { name: 'Teacher', code: 'teacher' },
          { name: 'Student', code: 'student' },
        ]
        await db.insert(schema.roles).values(roleData).onConflictDoNothing()
        const roles = await db.select().from(schema.roles)

        // Associate role permissions
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
        console.log('[startup] Base roles and permissions initialized')

        // Re-query admin role
        const [newAdminRole] = await db
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.code, 'admin'))
          .limit(1)

        if (!newAdminRole) {
          console.error('[startup] admin role creation failed')
          return
        }

        // Create admin user
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

        // Associate admin role
        await db.insert(schema.userRoles).values({
          userId: adminUser.id,
          roleId: newAdminRole.id,
        }).onConflictDoNothing()

        console.log(`[startup] Default admin account created (username: ${ADMIN_USERNAME}, password: ${ADMIN_PASSWORD})`)
      } else {
        // admin role already exists, create user directly
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

        // Associate admin role
        await db.insert(schema.userRoles).values({
          userId: adminUser.id,
          roleId: adminRole[0].id,
        }).onConflictDoNothing()

        console.log(`[startup] Default admin account created (username: ${ADMIN_USERNAME}, password: ${ADMIN_PASSWORD})`)
      }
    } else {
      console.log('[startup] admin account already exists, skip creation')
    }
  } catch (e) {
    console.error('[startup] admin account initialization failed', e)
  }
})
