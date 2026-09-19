import type { Ref } from 'vue'

/**
 * LMS 章节按钮 / 课程按钮开关配置合并
 *
 * 合并优先级（高 → 低）：
 *   课程级 lmsConfig.{chapterBtns|courseBtns}  >  全局 lms_config（useLmsPublicConfig）  >  硬编码默认
 *
 * 抽出本 composable 是为了消除 pages/course/[id]/index.vue 与 [cid].vue 之间重复的
 * 合并 watch。两个 page 仅"数据源"不同：
 *   - index.vue 从 detail.config.lmsConfig 取
 *   - [cid].vue  从 chapter course 对象的 courseBtns/chapterBtns/showDanmaku 取（API 已合并）
 *
 * 调用方传入 source（Ref），composable 负责 watch + 合并写入 useLayoutState 的
 * courseBtnsConfig / chapterBtnsConfig / showDanmaku。
 *
 * @param source 配置源；为 null 时跳过（数据未就绪）
 * @param options.flush watch flush 时机，[cid].vue 需要 'sync' 保证 SSR Suspense 恢复时同步执行
 */
export function useLmsBtnsConfig(
  source: Ref<{
    courseBtns?: Record<string, boolean>
    chapterBtns?: Record<string, boolean>
    showDanmaku?: boolean
  } | null>,
  options: { flush?: 'sync' | 'pre' | 'post' } = {},
) {
  const { courseBtns: courseBtnsPublic, chapterBtns: chapterBtnsPublic } = useLmsPublicConfig()
  const { courseBtnsConfig, chapterBtnsConfig, showDanmaku } = useLayoutState()

  const DEFAULT_COURSE_BTNS: Record<string, boolean> = {
    showProgress: true, showLeaderboard: true, showGroups: true,
    showGrades: true, showAnnouncements: true, showWrongBook: true, showMmo: true,
  }
  const DEFAULT_CHAPTER_BTNS: Record<string, boolean> = {
    showPlay: true, showScore: true, showSelect: true, showTimer: true,
    showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true,
  }

  watch(source, (s) => {
    if (!s) return
    if (s.showDanmaku !== undefined) showDanmaku.value = s.showDanmaku
    courseBtnsConfig.value = {
      ...DEFAULT_COURSE_BTNS,
      ...(courseBtnsPublic.value || {}),
      ...(s.courseBtns || {}),
    }
    chapterBtnsConfig.value = {
      ...DEFAULT_CHAPTER_BTNS,
      ...(chapterBtnsPublic.value || {}),
      ...(s.chapterBtns || {}),
    }
  }, { immediate: true, flush: options.flush ?? 'pre' })
}
