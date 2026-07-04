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
        :loading="loadingClasses"
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
}>()

const { t } = useI18n()
const toast = useToast()
const { hasRole, isCourseTeacher } = useAuth()

const canEdit = computed(() => {
  if (hasRole('admin')) return true
  return props.courseId ? isCourseTeacher(props.courseId) : false
})

const isOpen = ref(false)
const savingOpen = ref(false)
const loadingClasses = ref(false)
const classOptions = ref<{ label: string; value: number }[]>([])
const selectedClassIds = ref<number[]>([])

// 加载章节开放状态 + 班级列表
async function loadData() {
  if (!props.chapterId) return
  loadingClasses.value = true
  try {
    // 获取章节信息（含 isOpen）
    const chapterData = await cRequest<{ chapter: { isOpen?: boolean } }>(`/api/lms/chapters/show?id=${props.chapterId}`)
    isOpen.value = !!chapterData?.chapter?.isOpen

    // 获取章节的班级开放状态
    const classes = await cRequest<{ classId: number; name: string; open: boolean }[]>(`/api/lms/chapters/classes?chapterId=${props.chapterId}`)
    classOptions.value = (classes || []).map(c => ({ label: c.name, value: c.classId }))
    selectedClassIds.value = (classes || []).filter(c => c.open).map(c => c.classId)
  } catch (e) {
    console.error('[accessBar] 加载失败', e)
  } finally {
    loadingClasses.value = false
  }
}

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
    const classes = classOptions.value.map(c => ({
      classId: c.value,
      open: ids.includes(c.value),
    }))
    await cRequest('/api/lms/chapters/classes', {
      method: 'POST',
      body: { chapterId: props.chapterId, classes },
    })
    toast.add({ title: t('chapter.openUpdated'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('chapter.openUpdateFailed'), color: 'error' })
  }
}

watch(() => props.chapterId, (val) => {
  if (val) loadData()
}, { immediate: true })
</script>
