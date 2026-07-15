/**
 * Chapter button global state: manages fullscreen playback mode
 * - playFullscreen: Whether in fullscreen playback
 * - togglePlay: Toggle fullscreen, synchronously control sidebar visibility + browser fullscreen
 *
 * The play button UI has been migrated to doc/components/layout/toc.vue,
 * this composable provides shared state and toggle logic for use by toc.vue and page layouts.
 *
 * playFullscreen uses a fixed useState key to ensure cross-module state synchronization.
 * Previously located in the lms module, moved here because the playback feature was migrated to doc;
 * the lms module no longer needs to override this composable (the implementation is identical).
 */
export function useChapterBtns() {
  const route = useRoute()
  const playFullscreen = useState<boolean>('chapter-play-fullscreen', () => false)

  /** Enter browser fullscreen */
  function enterBrowserFullscreen() {
    if (import.meta.client) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }

  /** Exit browser fullscreen */
  function exitBrowserFullscreen() {
    if (import.meta.client && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  function togglePlay() {
    playFullscreen.value = !playFullscreen.value
    const { setLayout } = useLayoutState()
    if (playFullscreen.value) {
      // Enter fullscreen: hide left sidebar + browser fullscreen
      setLayout({ sidebar: false })
      enterBrowserFullscreen()
      // Wait for layout update then scroll to the first heading
      nextTick(() => {
        setTimeout(() => {
          const firstHeading = document.querySelector('h1, h2, h3')
          if (firstHeading) {
            firstHeading.scrollIntoView({ behavior: 'auto', block: 'start' })
          }
        }, 150)
      })
    } else {
      // Exit fullscreen: restore default (null = follow route), scroll back to top
      setLayout({ sidebar: null })
      exitBrowserFullscreen()
      nextTick(() => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }, 150)
      })
    }
  }

  /** Exit fullscreen and restore layout */
  function exitPlay() {
    if (playFullscreen.value) {
      playFullscreen.value = false
      const { setLayout } = useLayoutState()
      setLayout({ sidebar: null })
      exitBrowserFullscreen()
    }
  }

  // When the user manually exits browser fullscreen via Esc/F11, sync the playback state
  function onFullscreenChange() {
    if (!document.fullscreenElement && playFullscreen.value) {
      playFullscreen.value = false
      const { setLayout } = useLayoutState()
      setLayout({ sidebar: null })
    }
  }

  // Auto-exit fullscreen on route change
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
