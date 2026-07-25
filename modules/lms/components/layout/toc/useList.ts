import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface TocLink {
  id: string
  text: string
  children?: TocLink[]
}

export function useList(props: { links?: TocLink[] }) {
  const activeId = ref<string | null>(null)

  // 注入章节任务上下文（仅章节页存在，课程页为 null）
  const chapterTask = useChapterTask()

  function isDone(id: string): boolean {
    return !!chapterTask?.taskStatus.value?.[id]
  }

  /**
   * 将嵌套的 toc links 扁平化，用于 IntersectionObserver 监听
   */
  function flatten(links: TocLink[] = []): { id: string }[] {
    return links.flatMap((link) => [
      { id: link.id },
      ...flatten(link.children),
    ])
  }

  const flatIds = computed(() => flatten(props.links))

  let observer: IntersectionObserver | null = null

  function setupObserver() {
    observer?.disconnect()
    observer = null

    if (!flatIds.value.length) return

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length) {
          activeId.value = visible[0]?.target?.id ?? null
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: [0, 1],
      },
    )

    nextTick(() => {
      flatIds.value.forEach(({ id }) => {
        const el = document.getElementById(id)
        if (el) observer?.observe(el)
      })
    })
  }

  onMounted(setupObserver)
  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  watch(() => props.links, setupObserver)

  function scrollToHeading(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      activeId.value = id
    }
  }

  return {
    activeId, isDone, scrollToHeading,
  }
}
