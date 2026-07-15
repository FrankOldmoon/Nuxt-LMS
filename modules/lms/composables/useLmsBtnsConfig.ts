import type { Ref } from 'vue'

/**
 * LMS chapter button / course button toggle config merging
 *
 * Merge priority (high → low):
 *   Course-level lmsConfig.{chapterBtns|courseBtns}  >  Global lms_config (useLmsPublicConfig)  >  Hardcoded defaults
 *
 * This composable is extracted to eliminate the duplicated merge watch between
 * pages/course/[id]/index.vue and [cid].vue. The two pages only differ in "data source":
 *   - index.vue reads from detail.config.lmsConfig
 *   - [cid].vue  reads from chapter course object's courseBtns/chapterBtns/showDanmaku (API already merged)
 *
 * Caller passes in source (Ref), composable handles watch + merge writing to useLayoutState's
 * courseBtnsConfig / chapterBtnsConfig / showDanmaku.
 *
 * @param source config source; skip when null (data not ready)
 * @param options.flush watch flush timing, [cid].vue needs 'sync' to ensure SSR Suspense restore executes synchronously
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
    showGrades: true, showAnnouncements: true, showWrongBook: true,
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
