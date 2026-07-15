/**
 * LMS frontend types barrel
 *
 * The #lms alias points to the module root; #lms/types/lms resolves to docnew.ts via this barrel.
 * This way, `import type { LmsCourseSummary } from '#lms/types/lms'` can be correctly resolved by IDE/tsc.
 */
export * from './docnew'
