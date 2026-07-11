<template>
  <div>
    <!-- 播放/退出播放按钮（播放时显示在 TOC 最上方） -->
    <!-- chapterBtnsConfig.showPlay 关闭 OR chapterPage.enableFullscreen 关闭时隐藏 -->
    <div v-if="chapterBtnsConfig.showPlay && chapterPageCfg.enableFullscreen" class="mb-3">
      <UButton :label="playFullscreen ? $t('chapter.exitPlay') : $t('chapter.play')"
        :icon="playFullscreen ? 'i-lucide-minimize' : 'i-lucide-play'" :color="playFullscreen ? 'error' : 'primary'"
        variant="soft" size="sm" class="w-full justify-center" @click="togglePlay" />
    </div>

    <!-- lms 专有：章节按钮、班级卡片、学习进度 -->

    <ChapterBtns />
    <ClassUserCard />
    <!-- {{ isLoggedIn }}:{{ chapterTask }}:{{ totalHeadings }} -->

    <!-- 章节学习进度（heading 汇总）- 仅登录用户显示 -->
    <div v-if="isLoggedIn && chapterTask && totalHeadings > 0" class="pt-4 my-4 border-t border-default">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs text-muted">{{ $t('coursePanel.progress') }}</span>
        <span class="text-xs font-semibold" :class="allDone ? 'text-success' : 'text-primary'">
          {{ doneHeadings }}/{{ totalHeadings }}
        </span>
      </div>
      <UProgress :modelValue="progressPercent" />
    </div>


    <LayoutTocList :links="tocLinks" class="w-full" />

    <!-- 全屏播放模式：标题上下导航按钮 -->
    <div v-if="playFullscreen && flatHeadings.length"
      class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-default">
      <UButton icon="i-lucide-chevron-up" size="sm" variant="outline" :disabled="currentHeadingIndex <= 0"
        @click="goToHeading(-1)" />
      <span class="text-xs text-muted font-mono">
        {{ currentHeadingIndex + 1 }} / {{ flatHeadings.length }}
      </span>
      <UButton icon="i-lucide-chevron-down" size="sm" variant="outline"
        :disabled="currentHeadingIndex >= flatHeadings.length - 1" @click="goToHeading(1)" />
    </div>
    <p v-if="playFullscreen && flatHeadings.length" class="text-xs text-muted text-center mt-1.5">
      {{ $t('chapter.keyboardNavHint') }}
    </p>

    <!-- 页面内容编辑器（管理员或课程编辑者可见） -->
    <div v-if="canEditContent" class="hidden lg:flex flex-col gap-3 pt-4 mt-4 border-t border-default">
      <UModal v-model:open="editModalOpen" fullscreen scrollable>
        <UButton icon="i-lucide-edit" color="primary" size="sm" :label="$t('layout.editPage')" class="justify-start" />

        <template #body>
          <div class="p-4 min-w-[480px]">
            <ueditor v-model="chapterContent" :save-handler="handleSave" :lock-id="lockId" ref="ueditorRef" :show-insert="true" />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton :label="$t('common.save')" color="primary" variant="solid" size="sm" :loading="saving"
              @click="handleSaveClick" />
          </div>
        </template>
      </UModal>

      <!-- 历史记录 -->
      <ChapterHistoryModal :table="'chapters'" :id="chapterId" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { hasRole, user } = useAuth()
const { isCourseEditor } = useAuthLms()
const toast = useToast()
const { t } = useI18n()
const ueditorRef = ref()
const editModalOpen = ref(false)
const saving = ref(false)

const { tocLinks, chapterContent, notifyContentSaved, chapterBtnsConfig } = useLayoutState()
const { chapterId, courseId } = useLmsContext()
const { playFullscreen, togglePlay } = useChapterBtns()

// lms 公开配置：chapterPage.enableFullscreen 控制播放按钮显隐
const { chapterPage: chapterPageCfg } = useLmsPublicConfig()

const lockId = computed(() => chapterId.value ? `chapters_${chapterId.value}` : null)

// ── 登录状态 ──
const isLoggedIn = computed(() => !!user.value)

// ── lms 章节学习进度（仅在 mode=lms 时使用） ──
const chapterTask = computed(() => {
  try {
    return useChapterTask()
  } catch {
    return null
  }
})

const totalHeadings = computed(() => chapterTask.value?.taskMap.value.headings?.length ?? 0)
const doneHeadings = computed(() => {
  if (!chapterTask.value) return 0
  return chapterTask.value.taskMap.value.headings.filter(h => chapterTask.value!.taskStatus.value[h.id]).length
})
const progressPercent = computed(() => {
  if (totalHeadings.value === 0) return 0
  return Math.round((doneHeadings.value / totalHeadings.value) * 100)
})
const allDone = computed(() => totalHeadings.value > 0 && doneHeadings.value === totalHeadings.value)

// ── 全屏播放模式：标题导航 ──
const flatHeadings = computed(() => {
  const result: { id: string; text: string }[] = []
  function walk(links: any[]) {
    for (const link of links) {
      result.push({ id: link.id, text: link.text })
      if (link.children) walk(link.children)
    }
  }
  walk(tocLinks.value)
  return result
})

const currentHeadingIndex = ref(0)
let navObserver: IntersectionObserver | null = null

function setupNavObserver() {
  navObserver?.disconnect()
  navObserver = null
  if (!playFullscreen.value || !flatHeadings.value.length) return

  navObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length) {
        const id = visible[0]?.target?.id
        const idx = flatHeadings.value.findIndex((h) => h.id === id)
        if (idx >= 0) currentHeadingIndex.value = idx
      }
    },
    { rootMargin: '-80px 0px -70% 0px', threshold: [0, 1] },
  )

  nextTick(() => {
    flatHeadings.value.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) navObserver?.observe(el)
    })
  })
}

function goToHeading(direction: number) {
  const next = currentHeadingIndex.value + direction
  if (next < 0 || next >= flatHeadings.value.length) return
  const heading = flatHeadings.value[next]
  if (!heading) return
  const el = document.getElementById(heading.id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    currentHeadingIndex.value = next
  }
}

// 全屏播放：键盘左右方向键 = 上下导航按钮（← 上一个标题 / → 下一个标题）
function onPlayKeydown(e: KeyboardEvent) {
  if (!playFullscreen.value) return
  // 在输入框/文本域/可编辑区域内不拦截方向键，避免影响表单编辑
  const target = e.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    goToHeading(-1)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    goToHeading(1)
  }
}

watch([playFullscreen, tocLinks], () => {
  if (playFullscreen.value) {
    nextTick(() => setupNavObserver())
  } else {
    navObserver?.disconnect()
    navObserver = null
  }
})

// 进入/退出全屏播放时挂载/卸载键盘监听
watch(playFullscreen, (v) => {
  if (!import.meta.client) return
  if (v) window.addEventListener('keydown', onPlayKeydown)
  else window.removeEventListener('keydown', onPlayKeydown)
})

onBeforeUnmount(() => {
  navObserver?.disconnect()
  if (import.meta.client) window.removeEventListener('keydown', onPlayKeydown)
})

// ── 内容编辑权限 ──
const canEditContent = computed(() => {
  if (hasRole('admin')) return true
  return isCourseEditor(courseId.value)
})

async function handleSave(content: Record<string, any>) {
  const json = content?.json ?? content
  await cRequest(`/api/chapters/update`, {
    method: 'POST',
    body: { id: chapterId.value, content: json },
  })
  return 1
}

async function handleSaveClick() {
  saving.value = true
  try {
    await handleSave(chapterContent.value)

    toast.add({ title: t('layout.saveSuccess'), color: 'success' })
    editModalOpen.value = false

    await nextTick()
    notifyContentSaved()
  } catch (e: any) {
    toast.add({ title: e.message || t('layout.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>