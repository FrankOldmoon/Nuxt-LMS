/**
 * On server startup:
 *   1. Load lms configuration into in-memory cache (reloadLmsConfig internally auto-migrates the legacy single-row lms_config)
 *   2. On first startup, initialize 1 test class + 30 test student accounts
 *      - Flag uses flattened storage: configs(id='lms:_system.testAccountsSeeded', value=true)
 *      - No longer writes to the legacy single-row lms_config json
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
const TEST_PASSWORD = 'REDACTED'
const TEST_COUNT = 30
const TEST_CLASS_NAME = 'test'
const TEST_CLASS_CODE = 'test'

/** Flattened system flag (lms: prefix, _system namespace to avoid conflicts with business configs) */
const SEED_FLAG_KEY = 'lms:_system.testAccountsSeeded'

export default defineNitroPlugin(async () => {
  await reloadLmsConfig()

  // On first startup, initialize test class + 30 test accounts (only once)
  try {
    // Read the flattened row directly to avoid timing issues with reload during startup
    const flagRow = await db.query.configs.findFirst({
      where: eq(schema.configs.id, SEED_FLAG_KEY),
    })
    if (flagRow?.value === true) {
      return
    }

    // 1. Query the student role (created first by the admin startup plugin)
    const studentRoleRows = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.code, 'student'))
      .limit(1)

    if (studentRoleRows.length === 0) {
      console.warn('[lms-config-startup] student role does not exist, skipping test account initialization (admin startup plugin will create it)')
      return
    }
    const studentRoleId = studentRoleRows[0].id

    // 2. Handle test class: if the classes table is empty, create a class with id=1
    const existingClasses = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .limit(1)

    if (existingClasses.length === 0) {
      // Let the database auto-increment id=1 (first insert of a serial primary key is always 1)
      await db
        .insert(schema.classes)
        .values({ name: TEST_CLASS_NAME, code: TEST_CLASS_CODE })
      console.log(`[lms-config-startup] Created test class (id=1)`)
    } else {
      console.log(`[lms-config-startup] classes table already has class ${existingClasses[0].id}, skipping creation`)
    }

    // 3. Create 30 test student accounts (directly set users.classId=1)
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
        classId: 1,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Batch insert users
    const insertedUsers = await db
      .insert(schema.users)
      .values(userInserts)
      .onConflictDoNothing()
      .returning({ id: schema.users.id, username: schema.users.username })

    // Associate the student role to successfully inserted users
    for (const u of insertedUsers) {
      roleInserts.push({ userId: u.id, roleId: studentRoleId })
    }
    if (roleInserts.length) {
      await db.insert(schema.userRoles).values(roleInserts).onConflictDoNothing()
    }

    // 4. Write the flag (flattened storage, independent lms:_system.testAccountsSeeded row)
    await db
      .insert(schema.configs)
      .values({ id: SEED_FLAG_KEY, value: true })
      .onConflictDoUpdate({
        target: schema.configs.id,
        set: { value: true },
      })

    console.log(`[lms-config-startup] Initialized ${insertedUsers.length}/${TEST_COUNT} test accounts (password: ${TEST_PASSWORD}, all assigned to class_id=1)`)
  } catch (e) {
    console.error('[lms-config-startup] test account initialization failed', e)
  }

  // On first startup, seed initial global goods (only once)
  try {
    const GOODS_SEED_FLAG = 'lms:_system.goodsSeeded'
    const goodsFlag = await db.query.configs.findFirst({
      where: eq(schema.configs.id, GOODS_SEED_FLAG),
    })
    if (goodsFlag?.value === true) {
      return
    }

    const initialGoods = [
      { name: 'Homework Pass', content: { icon: 'i-lucide-file-x', color: 'warning', description: 'Skip one homework assignment', emoji: '📝' }, price: 50, sellPrice: 25 },
      { name: 'Snack Card', content: { icon: 'i-lucide-cookie', color: 'success', description: 'Redeem for a snack', emoji: '🍪' }, price: 20, sellPrice: 10 },
      { name: 'Hint Card', content: { icon: 'i-lucide-lightbulb', color: 'primary', description: 'Get a hint for a question', emoji: '💡' }, price: 30, sellPrice: 15 },
      { name: 'Revive Card', content: { icon: 'i-lucide-heart-pulse', color: 'error', description: 'Revive once after failure', emoji: '❤️' }, price: 100, sellPrice: 50 },
      { name: 'Bonus Card', content: { icon: 'i-lucide-star', color: 'gold', description: 'Get extra points', emoji: '⭐' }, price: 80, sellPrice: 40 },
    ]

    await db.insert(schema.goods).values(
      initialGoods.map((g, i) => ({
        name: g.name,
        content: g.content,
        courseId: 0,
        price: g.price,
        sellPrice: g.sellPrice,
        stock: -1,
        type: 'item',
        order: i,
      }))
    ).onConflictDoNothing()

    await db.insert(schema.configs).values({ id: GOODS_SEED_FLAG, value: true })
      .onConflictDoUpdate({ target: schema.configs.id, set: { value: true } })

    console.log(`[lms-config-startup] Seeded ${initialGoods.length} global goods`)
  } catch (e) {
    console.error('[lms-config-startup] Goods seeding failed', e)
  }
})
