<template>
  <div>
    <!-- 播放/退出播放按钮（播放时显示在 TOC 最上方） -->
    <div v-if="chapterBtnsConfig.showPlay" class="mb-3">
      <UButton
        :label="playFullscreen ? $t('chapter.exitPlay') : $t('chapter.play')"
        :icon="playFullscreen ? 'i-lucide-minimize' : 'i-lucide-play'"
        :color="playFullscreen ? 'error' : 'primary'"
        variant="soft" size="sm" class="w-full justify-center" @click="togglePlay" />
    </div>

    <!-- 上层模块注入：ChapterBtns / ClassUserCard / 学习进度等（lms 用） -->
    <slot name="extra" />

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

    <!-- 页面内容编辑器（管理员或课程编辑者可见） -->
    <div v-if="canEditContent" class="hidden lg:flex flex-col gap-3 pt-4 mt-4 border-t border-default">
      <UModal v-model:open="editModalOpen" fullscreen scrollable>
        <UButton icon="i-lucide-edit" color="primary" size="sm" :label="$t('layout.editPage')"
          class="justify-start" />

        <template #body>
          <div class="p-4 min-w-[480px]">
            <ueditor v-model="editableContent" :save-handler="handleSave" :lock-id="lockId" ref="ueditorRef" />
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
      <ContentHistoryModal :table="editableTable" :id="editableId" />
    </div>
  </div>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor } = useAuth()
const toast = useToast()
const { t } = useI18n()

const ueditorRef = ref()
const editModalOpen = ref(false)
const saving = ref(false)

const { tocLinks, editableContent, editableTable, editableId, editableCourseId, notifyContentSaved, chapterBtnsConfig } = useLayoutState()
const { playFullscreen, togglePlay } = useChapterBtns()
const nuxtApp = useNuxtApp()

const lockId = computed(() => editableTable.value && editableId.value ? `${editableTable.value}_${editableId.value}` : null)

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

watch([playFullscreen, tocLinks], () => {
  if (playFullscreen.value) {
    nextTick(() => setupNavObserver())
  } else {
    navObserver?.disconnect()
    navObserver = null
  }
})

onBeforeUnmount(() => {
  navObserver?.disconnect()
})

const canEditContent = computed(() => {
  if (hasRole('admin')) return true
  if (editableTable.value === 'courses') return isCourseEditor(editableId.value)
  if (editableTable.value === 'chapters') return isCourseEditor(editableCourseId.value)
  return false
})

async function handleSave(content: Record<string, any>) {
  const json = content?.json ?? content
  await cRequest(`/api/${editableTable.value}/update`, {
    method: 'POST',
    body: { id: editableId.value, content: json },
  })
  return 1
}

async function handleSaveClick() {
  saving.value = true
  try {
    await handleSave(editableContent.value)

    const table = editableTable.value
    const id = editableId.value
    const courseId = editableCourseId.value
    for (const key of Object.keys(nuxtApp.payload.data)) {
      if (key.includes(`/${table}/show`) || key.includes(`course_id=${courseId}`) || key.includes(`id=${id}`)) {
        delete nuxtApp.payload.data[key]
      }
    }

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
