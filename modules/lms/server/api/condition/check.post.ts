/**
 * Condition check API
 * POST /api/condition/check
 *
 * body: { conditions: [{ type, value }] }
 * Condition types:
 *   - role: check user role (admin/teacher/student; the teacher condition also passes for admin)
 *   - class: check whether the user belongs to the specified class
 *   - question / homework / comment / quiz / race: check whether the user has completed the specified cid array (all must be completed)
 *
 * Returns { met: boolean, details: [{ type, value, met }] }
 */
import { checkCondition } from '../../utils/conditions'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const conditions = (await readBody(event))?.conditions

  if (!Array.isArray(conditions) || !conditions.length) {
    return cResp({ met: true, details: [] }, 'No conditions, satisfied by default')
  }

  // Concurrently check each condition, collect met / details
  const settled = await Promise.all(conditions.map(async (cond: any) => {
    const met = await checkCondition(user, cond)
    return { type: cond.type, value: cond.value, met }
  }))

  const allMet = settled.every(d => d.met)
  return cResp({ met: allMet, details: settled })
})
