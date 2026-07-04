/**
 * 章节按钮全局状态：管理全屏播放模式
 * - playFullscreen: 是否处于全屏播放
 * - togglePlay: 切换全屏，同步控制 sidebar 显隐
 */
export function useChapterBtns() {
  const route = useRoute()
  const playFullscreen = useState<boolean>('chapter-play-fullscreen', () => false)

  function togglePlay() {
    playFullscreen.value = !playFullscreen.value
    const { setLayout } = useLayoutState()
    if (playFullscreen.value) {
      // 进入全屏：隐藏左侧 sidebar
      setLayout({ sidebar: false })
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
    }
  }

  // 路由变化时自动退出全屏
  watch(() => route.path, () => {
    if (playFullscreen.value) {
      playFullscreen.value = false
    }
  })

  return { playFullscreen, togglePlay, exitPlay }
}
