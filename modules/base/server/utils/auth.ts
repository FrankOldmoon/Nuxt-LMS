/**
 * Auth utility - re-export layer
 *
 * Split sub-modules:
 * - ./auth/password: password hashing / verification / token generation
 * - ./auth/guards: user context parsing and role guards
 *
 * Nuxt auto-import still recognizes all exports under utils/auth/*,
 * existing calls (requireAuth / getCurrentUser / generateToken, etc.) need no changes.
 */
export * from './auth/password'
export * from './auth/guards'
