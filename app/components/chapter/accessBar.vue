<template>
  <div v-if="canEdit" class="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg flex-wrap">
    <!-- 章节开放开关 -->
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-unlock" class="size-4 text-muted" />
      <span class="text-sm font-medium">{{ $t('chapter.openToAll') }}</span>
      <USwitch v-model="isOpen" :loading="savingOpen" @update:model-value="updateOpen" />
    </div>

    <USeparator orientation="vertical" class="h-6" />

    <!-- 班级多选 -->
    <div class="flex items-center gap-2 flex-1 min-w-[200px]">
      <UIcon name="i-lucide-school" class="size-4 text-muted" />
      <span class="text-sm font-medium whitespace-nowrap">{{ $t('chapter.openClasses') }}</span>
      <USelect
        v-model="selectedClassIds"
        :items="classOptions"
        multiple
        size="sm"
        class="flex-1"
        :disabled="isOpen"
        @update:model-value="updateClassOpen"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  chapterId: number
  courseId: number
  chapterData?: {
    isOpen?: boolean
    classChapters?: { classId: number; open: boolean }[]
  }
}>()

const { t } = useI18n()
const toast = useToast()
const { hasRole, isCourseTeacher } = useAuth()
const { classes, loadClasses } = useClasses()

const canEdit = computed(() => {
  if (hasRole('admin')) return true
  return props.courseId ? isCourseTeacher(props.courseId) : false
})

const isOpen = ref(false)
const savingOpen = ref(false)
const selectedClassIds = ref<number[]>([])

// 班级选项（来自全局缓存）
const classOptions = computed(() =>
  classes.value.map(c => ({ label: c.name, value: c.id }))
)

// 从页面传入的 chapterData 初始化（无需额外 API 请求）
watch(() => props.chapterData, (data) => {
  if (!data) return
  isOpen.value = !!data.isOpen
  selectedClassIds.value = (data.classChapters || []).filter(c => c.open).map(c => c.classId)
}, { immediate: true })

// 更新章节 isOpen
async function updateOpen(val: boolean) {
  savingOpen.value = true
  try {
    await cRequest('/api/lms/chapters/update', {
      method: 'POST',
      body: { id: props.chapterId, isOpen: val },
    })
    toast.add({ title: t('chapter.openUpdated'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
    isOpen.value = !val
  } finally {
    savingOpen.value = false
  }
}

// 更新班级开放状态
async function updateClassOpen(ids: number[]) {
  try {
    const classList = classes.value.map(c => ({
      classId: c.id,
      open: ids.includes(c.id),
    }))
    await cRequest('/api/lms/chapters/classes', {
      method: 'POST',
      body: { chapterId: props.chapterId, classes: classList },
    })
    toast.add({ title: t('chapter.openUpdated'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
  }
}

// 首次加载班级列表（全局缓存）
loadClasses()
</script>
