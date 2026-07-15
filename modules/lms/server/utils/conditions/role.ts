/**
 * Condition type: role
 *
 * Check the user's role. Note: the teacher condition also passes for admin (consistent with the client-side render.vue)
 */
export function checkRole(user: { roles: string[] }, value: string): boolean {
  if (user.roles.includes(value)) return true
  if (value === 'teacher' && user.roles.includes('admin')) return true
  return false
}
