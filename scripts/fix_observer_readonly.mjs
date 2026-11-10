/**
 * observer 账号降权：备份 + 摘掉 teacher 角色与课程教师身份
 *
 * 用法：
 *   node scripts/fix_observer_readonly.mjs          # 只看（打印 + 写备份文件）
 *   node scripts/fix_observer_readonly.mjs --apply  # 实际执行 DELETE
 *
 * 背景：observer（users.id=1072）身上挂了 teacher 用户角色 + 1 条 user_courses.is_teacher=true，
 *       导致 requireRole(['teacher','admin']) 的写接口对它全部放行。
 *       本脚本只动这两处，保留 is_teacher=false 的学生身份（用于跟随班级看课程）。
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
    select id, username, name, email from users where username = 'observer' limit 1`
  if (!user) {
    console.log('未找到 username=observer 的账号，退出')
    process.exit(0)
  }
  console.log('目标账号：', user)

  const roles = await sql`
    select r.id, r.code, r.name
    from user_roles ur join roles r on r.id = ur.role_id
    where ur.user_id = ${user.id} order by r.id`
  console.log('当前角色：', roles)

  const courses = await sql`
    select course_id, is_teacher, is_editor, "group"
    from user_courses where user_id = ${user.id}
    order by is_teacher desc, course_id`
  console.log('user_courses 记录：', courses.length, '条')
  for (const c of courses) {
    console.log(`  course=${c.course_id} isTeacher=${c.is_teacher} isEditor=${c.is_editor} group=${c.group}`)
  }

  const teacherRoles = roles.filter((r) => r.code === 'teacher')
  const teacherCourseRows = courses.filter((c) => c.is_teacher)

  // 备份
  const dir = resolve(here, '../logs')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = resolve(dir, `observer-readonly-backup-${stamp}.json`)
  writeFileSync(file, JSON.stringify({ user, roles, courses, at: new Date().toISOString() }, null, 2))
  console.log('\n备份已写入：', file)

  console.log('\n计划删除：')
  console.log(`  user_roles: teacher 角色绑定 ${teacherRoles.length} 条`)
  console.log(`  user_courses: is_teacher=true 的 ${teacherCourseRows.length} 条 -> courseId=${teacherCourseRows.map(c => c.course_id).join(',') || '无'}`)

  if (!APPLY) {
    console.log('\n【只看模式】加 --apply 才会真正删除')
  } else {
    const r1 = await sql`
      delete from user_roles where user_id = ${user.id}
      and role_id in (select id from roles where code = 'teacher')`
    const r2 = await sql`
      delete from user_courses where user_id = ${user.id} and is_teacher = true`
    console.log(`\n已删除 user_roles ${r1.count} 条、user_courses ${r2.count} 条`)

    const afterRoles = await sql`
      select r.code from user_roles ur join roles r on r.id = ur.role_id
      where ur.user_id = ${user.id} order by r.id`
    console.log('删除后角色：', afterRoles.map(r => r.code))
    const [afterUc] = await sql`
      select count(*)::int as cnt, count(*) filter (where is_teacher)::int as teacher_cnt,
             count(*) filter (where is_editor)::int as editor_cnt
      from user_courses where user_id = ${user.id}`
    console.log('删除后 user_courses：', afterUc)
  }
} finally {
  await sql.end()
}
