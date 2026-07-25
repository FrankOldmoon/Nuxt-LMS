/**
 * 条件检查接口
 * POST /api/condition/check
 *
 * body: { conditions: [{ type, value }] }
 * 条件类型：
 *   - role: 检查用户角色（admin/teacher/student；teacher 条件 admin 也通过）
 *   - class: 检查用户是否属于指定班级
 *   - question / homework / comment / quiz / race: 检查用户是否完成指定 cid 数组（需全部完成）
 *
 * 返回 { met: boolean, details: [{ type, value, met }] }
 */
import { checkCondition } from '../../utils/conditions'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const conditions = (await readBody(event))?.conditions

  if (!Array.isArray(conditions) || !conditions.length) {
    return cResp({ met: true, details: [] }, '无条件，默认满足')
  }

  // 并发检查每条 condition，收集 met / details
  const settled = await Promise.all(conditions.map(async (cond: any) => {
    const met = await checkCondition(user, cond)
    return { type: cond.type, value: cond.value, met }
  }))

  const allMet = settled.every(d => d.met)
  return cResp({ met: allMet, details: settled })
})
