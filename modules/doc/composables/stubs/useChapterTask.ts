/**
 * 章节任务完成状态上下文（doc stub）
 *
 * 仅提供基本的 inject 读取，无 setupChapterTask 实现。
 * lms 启用时，lms/composables/useChapterTask.ts 覆盖本 composable，
 * 提供完整的 ChapterTaskContext 类型 + setupChapterTask 初始化函数。
 *
 * 本文件位于 stubs/ 子目录，仅当 lms 模块未启用时由 doc/index.ts 注册，
 * 避免与 lms 版本产生 "Duplicated imports" 警告。
 */
const CHAPTER_TASK_KEY = 'chapter-task-context'

export function useChapterTask(): any {
  return inject<any>(CHAPTER_TASK_KEY, null)
}
