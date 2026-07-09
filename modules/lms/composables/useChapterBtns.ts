/**
 * 章节按钮全局状态：管理全屏播放模式
 * - playFullscreen: 是否处于全屏播放
 * - togglePlay: 切换全屏，同步控制 sidebar 显隐 + 浏览器全屏
 *
 * 播放按钮 UI 已迁移至 doc/components/layout/toc.vue，
 * 本 composable 提供共享状态与切换逻辑，供 toc.vue 及页面布局使用。
 *
 * playFullscreen 使用固定的 useState key，确保跨模块状态同步。
 * 曾位于 lms 模块，因播放功能迁入 doc 而移至此处；
 * lms 模块不再需要覆盖本 composable（实现完全一致）。
 */
export function useChapterBtns() {
  const route = useRoute()
  const playFullscreen = useState<boolean>('chapter-play-fullscreen', () => false)

  /** 进入浏览器全屏 */
  function enterBrowserFullscreen() {
    if (import.meta.client) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }

  /** 退出浏览器全屏 */
  function exitBrowserFullscreen() {
    if (import.meta.client && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  function togglePlay() {
    playFullscreen.value = !playFullscreen.value
    const { setLayout } = useLayoutState()
    if (playFullscreen.value) {
      // 进入全屏：隐藏左侧 sidebar + 浏览器全屏
      setLayout({ sidebar: false })
      enterBrowserFullscreen()
      // 等待布局更新后滚动到第一个标题
      nextTick(() => {
        setTimeout(() => {
          const firstHeading = document.querySelector('h1, h2, h3')
          if (firstHeading) {
            firstHeading.scrollIntoView({ behavior: 'auto', block: 'start' })
          }
        }, 150)
      })
    } else {
      // 退出全屏：恢复默认（null = 跟随路由），滚动回最上方
      setLayout({ sidebar: null })
      exitBrowserFullscreen()
      nextTick(() => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }, 150)
      })
    }
  }

  /** 退出全屏并恢复布局 */
  function exitPlay() {
    if (playFullscreen.value) {
      playFullscreen.value = false
      const { setLayout } = useLayoutState()
      setLayout({ sidebar: null })
      exitBrowserFullscreen()
    }
  }

  // 用户通过 Esc/F11 手动退出浏览器全屏时，同步播放状态
  function onFullscreenChange() {
    if (!document.fullscreenElement && playFullscreen.value) {
      playFullscreen.value = false
      const { setLayout } = useLayoutState()
      setLayout({ sidebar: null })
    }
  }

  // 路由变化时自动退出全屏
  watch(() => route.path, () => {
    if (playFullscreen.value) {
      playFullscreen.value = false
      exitBrowserFullscreen()
    }
  })

  onMounted(() => {
    if (import.meta.client) {
      document.addEventListener('fullscreenchange', onFullscreenChange)
    }
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  })

  return { playFullscreen, togglePlay, exitPlay }
}
