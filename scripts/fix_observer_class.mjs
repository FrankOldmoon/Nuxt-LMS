/**
 * observer 账号班级清理：只保留 observer 班，摘掉混进去的教学班（如 8V）
 *
 * 用法：
 *   node scripts/fix_observer_class.mjs          # 只看
 *   node scripts/fix_observer_class.mjs --apply  # 执行
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { getProdUrl } from './_prod-url.mjs'

const APPLY = process.argv.includes('--apply')
const here = dirname(fileURLToPath(import.meta.url))
const sql = postgres(getProdUrl(), { max: 1 })

try {
  const [user] = await sql`
    select id, username, name, class_id, default_class from users where username = 'observer' limit 1`
  console.log('账号：', user)

  const [obsClass] = await sql`select id, name, code from classes where code = 'observer' limit 1`
  console.log('observer 班：', obsClass)

  const rows = await sql`
    select uc.class_id, uc.is_teacher, uc.deleted_at, c.name, c.code
    from user_classes uc left join classes c on c.id = uc.class_id
    where uc.user_id = ${user.id} order by uc.class_id`
  console.log('\nuser_classes 记录：')
  for (const r of rows) {
    console.log(`  classId=${r.class_id} name=${r.name} code=${r.code} isTeacher=${r.is_teacher} deleted=${r.deleted_at}`)
  }

  // 要摘的：所有非 observer 班的记录
  const toRemove = rows.filter((r) => r.code !== 'observer' && !r.deleted_at)
  console.log('\n将软删除（deleted_at=now）的关联：', toRemove.map((r) => `${r.class_id}(${r.name})`).join(', ') || '无')
  console.log('users.class_id 目标值：', obsClass?.id, `（当前 ${user.class_id}）`)
  console.log('users.default_class 当前：', JSON.stringify(user.default_class))
  console.log('users.default_class 目标：', JSON.stringify({ id: obsClass?.id, name: obsClass?.name }))

  const dir = resolve(here, '../logs')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = resolve(dir, `observer-class-backup-${stamp}.json`)
  writeFileSync(file, JSON.stringify({ user, obsClass, rows, at: new Date().toISOString() }, null, 2))
  console.log('备份：', file)

  if (!APPLY) {
    console.log('\n【只看模式】加 --apply 才会真正修改')
  } else {
    if (toRemove.length) {
      const r = await sql`
        update user_classes set deleted_at = now(), updated_at = now()
        where user_id = ${user.id} and deleted_at is null
          and class_id in ${sql(toRemove.map((x) => x.class_id))}`
      console.log(`\n软删除 user_classes ${r.count} 条`)
    }
    if (obsClass && user.class_id !== obsClass.id) {
      const r = await sql`
        update users set class_id = ${obsClass.id}, updated_at = now() where id = ${user.id}`
      console.log(`更新 users.class_id -> ${obsClass.id}（${r.count} 行）`)
    }

    // default_class 是「当前选中班级」快照（jsonb），不是归属。
    // observer 停在其他教学班上会让 N 个 records 接口默认查错班，这里对齐到 observer 班。
    if (obsClass && user.default_class?.id !== obsClass.id) {
      const r = await sql`
        update users set default_class = ${sql.json({ id: obsClass.id, name: obsClass.name })}, updated_at = now()
        where id = ${user.id}`
      console.log(`更新 users.default_class -> {id:${obsClass.id},name:${obsClass.name}}（${r.count} 行）`)
    }

    const after = await sql`
      select uc.class_id, c.name, c.code from user_classes uc
      left join classes c on c.id = uc.class_id
      where uc.user_id = ${user.id} and uc.deleted_at is null`
    const [u2] = await sql`select class_id, default_class from users where id = ${user.id}`
    console.log('清理后 user_classes：', after)
    console.log('清理后 users.class_id：', u2.class_id, '| default_class：', JSON.stringify(u2.default_class))
  }
} finally {
  await sql.end()
}
