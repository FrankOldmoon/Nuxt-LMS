/**
 * LMS 前端类型 barrel
 *
 * #lms 别名指向模块根目录，#lms/types/lms 经此 barrel 解析到 docnew.ts。
 * 这样 `import type { LmsCourseSummary } from '#lms/types/lms'` 可被 IDE/tsc 正确解析。
 */
export * from './docnew'
