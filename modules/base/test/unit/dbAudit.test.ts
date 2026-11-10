/**
 * 数据库写入审计解析单元测试
 * @see modules/base/server/utils/dbAudit.ts
 *
 * parseWriteOp 只做纯文本识别：区分 INSERT / UPDATE / DELETE，
 * 并标记「缺 where 的 UPDATE/DELETE」（整表生效，异常判定里算 critical）。
 */
import { describe, it, expect } from 'vitest'
import { parseWriteOp } from '../../server/utils/dbAudit'

describe('utils/dbAudit.parseWriteOp', () => {
  it('识别 insert into（带引号表名）', () => {
    const r = parseWriteOp('insert into "user_roles" ("user_id", "role_id") values ($1, $2)')
    expect(r).toEqual({ op: 'INSERT', table: 'user_roles', noWhere: false })
  })

  it('insert ... on conflict do update 仍算 INSERT', () => {
    const r = parseWriteOp('insert into "user_courses" ("user_id") values ($1) on conflict do update set "score" = $2')
    expect(r?.op).toBe('INSERT')
    expect(r?.table).toBe('user_courses')
  })

  it('识别 update ... set 并取表名', () => {
    const r = parseWriteOp('update "chapters" set "content" = $1 where "chapters"."id" = $2')
    expect(r).toEqual({ op: 'UPDATE', table: 'chapters', noWhere: false })
  })

  it('识别 delete from（硬删除）', () => {
    const r = parseWriteOp('delete from "announcements" where "announcements"."id" = $1')
    expect(r).toEqual({ op: 'DELETE', table: 'announcements', noWhere: false })
  })

  it('无引号表名同样识别', () => {
    expect(parseWriteOp('delete from temp_log')?.table).toBe('temp_log')
  })

  it('缺 where 的 DELETE 标记 noWhere', () => {
    const r = parseWriteOp('delete from "user_chapters"')
    expect(r?.op).toBe('DELETE')
    expect(r?.noWhere).toBe(true)
  })

  it('缺 where 的 UPDATE 标记 noWhere', () => {
    expect(parseWriteOp('update "users" set "deleted_at" = now()')?.noWhere).toBe(true)
  })

  it('字符串字面量里的 update 不误判', () => {
    expect(parseWriteOp(`select * from users where note = 'update "x" set y = 1'`)).toBeNull()
  })

  it('普通 select 返回 null', () => {
    expect(parseWriteOp('select * from "users" limit 1')).toBeNull()
  })
})
