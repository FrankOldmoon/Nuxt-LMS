/**
 * 服务启动时：
 *   1. 加载 lms 配置到内存缓存（reloadLmsConfig 内部自动迁移旧 lms_config 单行）
 *   2. 播种初始全局商品（按版本号，仅一次）
 *   3. 首次启动时初始化 1 个 test 班级 + 30 个 test 学生账号
 *      - 标记位使用拍平存储：configs(id='lms:_system.testAccountsSeeded', value=true)
 *      - 不再写入 lms_config 单行 json
 */
import { db, schema } from "@nuxthub/db"
import { and, eq, inArray } from "drizzle-orm"
const TEST_PASSWORD = 'REDACTED'
const TEST_COUNT = 30
const TEST_CLASS_NAME = 'test'
const TEST_CLASS_CODE = 'test'

/** 拍平存储的系统标记位（lms: 前缀，_system 命名空间避免与业务配置冲突） */
const SEED_FLAG_KEY = 'lms:_system.testAccountsSeeded'

export default defineNitroPlugin(async () => {
  await reloadLmsConfig()

  // 注册 lms 配置重载器：base 的 config-freshness 请求钩子检测到版本戳变化时调用，
  // 使其它进程在下一次请求时也能重载最新 lms 配置（跨进程一致性）。
  registerConfigReloader(async () => {
    await reloadLmsConfig()
    broadcastToAll({ type: 'lms-config-changed' })
  })

  // 播种初始全局商品（按版本号，版本变化时重播）
  try {
    const GOODS_SEED_VERSION = 3
    const GOODS_SEED_FLAG = 'lms:_system.goodsSeeded'
    const goodsFlag = await db.query.configs.findFirst({
      where: eq(schema.configs.id, GOODS_SEED_FLAG),
    })

    if (goodsFlag?.value !== GOODS_SEED_VERSION) {
      // 头像框商品：type='avatar_frame' + content.frame（商店 SVG 预览 / 佩戴）
      const frameGoods = [
        { name: 'Bronze Avatar Frame', frame: 'bronze', price: 1000, sellPrice: 500, color: 'bronze', emoji: '🥉' },
        { name: 'Silver Avatar Frame', frame: 'silver', price: 2000, sellPrice: 1000, color: 'silver', emoji: '🥈' },
        { name: 'Gold Avatar Frame', frame: 'gold', price: 3000, sellPrice: 1500, color: 'gold', emoji: '🥇' },
      ]
      // 其他初始商品
      const otherGoods = [
        // 零食卡
        { name: 'Small Snack Card', content: { icon: 'i-lucide-candy', color: 'success', description: 'Redeem for a small snack', emoji: '🍬' }, price: 1000, sellPrice: 500 },
        { name: 'Medium Snack Card', content: { icon: 'i-lucide-cookie', color: 'warning', description: 'Redeem for a medium snack', emoji: '🍪' }, price: 2000, sellPrice: 1000 },
        { name: 'Large Snack Card', content: { icon: 'i-lucide-cake-slice', color: 'primary', description: 'Redeem for a large snack', emoji: '🍰' }, price: 3000, sellPrice: 1500 },
        // 礼品卡
        { name: 'Small Gift Card', content: { icon: 'i-lucide-gift', color: 'info', description: 'Redeem for a small gift', emoji: '🎁' }, price: 1000, sellPrice: 500 },
        { name: 'Medium Gift Card', content: { icon: 'i-lucide-gift', color: 'success', description: 'Redeem for a medium gift', emoji: '🎀' }, price: 2000, sellPrice: 1000 },
        { name: 'Large Gift Card', content: { icon: 'i-lucide-party-popper', color: 'gold', description: 'Redeem for a large gift', emoji: '🎉' }, price: 3000, sellPrice: 1500 },
      ]

      // 清除旧版默认商品，避免残留；仅匹配已知默认商品名，不影响用户自建商品
      const LEGACY_GOODS = ['Homework Pass', 'Snack Card', 'Hint Card', 'Revive Card', 'Bonus Card']
      await db.delete(schema.goods).where(
        and(eq(schema.goods.courseId, 0), inArray(schema.goods.name, LEGACY_GOODS))
      )

      // 头像框商品：幂等 upsert（按 name 更新已存在记录为 avatar_frame 类型）
      for (const [i, g] of frameGoods.entries()) {
        const existing = await db
          .select({ id: schema.goods.id })
          .from(schema.goods)
          .where(and(eq(schema.goods.courseId, 0), eq(schema.goods.name, g.name)))
          .limit(1)
        const content = { frame: g.frame, color: g.color, description: `${g.emoji} Avatar frame`, emoji: g.emoji }
        if (existing[0]) {
          await db.update(schema.goods)
            .set({ content, type: 'avatar_frame', price: g.price, sellPrice: g.sellPrice, stock: -1, order: i })
            .where(eq(schema.goods.id, existing[0].id))
        } else {
          await db.insert(schema.goods).values({
            name: g.name, content, courseId: 0, price: g.price, sellPrice: g.sellPrice,
            stock: -1, type: 'avatar_frame', order: i,
          })
        }
      }

      await db.insert(schema.goods).values(
        otherGoods.map((g, i) => ({
          name: g.name,
          content: g.content,
          courseId: 0,
          price: g.price,
          sellPrice: g.sellPrice,
          stock: -1,
          type: 'item',
          order: frameGoods.length + i,
        }))
      ).onConflictDoNothing()

      await db.insert(schema.configs).values({ id: GOODS_SEED_FLAG, value: GOODS_SEED_VERSION })
        .onConflictDoUpdate({ target: schema.configs.id, set: { value: GOODS_SEED_VERSION } })

      console.log(`[lms-config-startup] 已播种 ${frameGoods.length + otherGoods.length} 个全局商品（v${GOODS_SEED_VERSION}）`)
    }
  } catch (e) {
    console.error('[lms-config-startup] 商品播种失败', e)
  }

  // 首次启动时初始化 test 班级 + 30 个 test 账号（仅一次）
  try {
    // 直接读拍平行，避免启动期 reload 时序问题
    const flagRow = await db.query.configs.findFirst({
      where: eq(schema.configs.id, SEED_FLAG_KEY),
    })
    if (flagRow?.value === true) {
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

    // 3. 创建 30 个 test 学生账号（直接设置 users.classId=1）
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

    // 4. 写入标记位（拍平存储，独立 lms:_system.testAccountsSeeded 行）
    await db
      .insert(schema.configs)
      .values({ id: SEED_FLAG_KEY, value: true })
      .onConflictDoUpdate({
        target: schema.configs.id,
        set: { value: true },
      })

    console.log(`[lms-config-startup] 已初始化 ${insertedUsers.length}/${TEST_COUNT} 个 test 账号（密码: ${TEST_PASSWORD}，全部归属 class_id=1）`)
  } catch (e) {
    console.error('[lms-config-startup] test 账号初始化失败', e)
  }
})
