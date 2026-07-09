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
    <div class="flex items-center gap-2 min-w-[200px] max-w-[480px]">
      <UIcon name="i-lucide-school" class="size-4 text-muted" />
      <span class="text-sm font-medium whitespace-nowrap">{{ $t('chapter.openClasses') }}</span>
      <USelect
        v-model="selectedClassIds"
        :items="classOptions"
        multiple
        size="sm"
        class="min-w-[200px] max-w-[400px]"
        @update:model-value="updateClassOpen"
      />
      <span v-if="isOpen" class="text-xs text-muted whitespace-nowrap">{{ $t('chapter.openClassesHint') }}</span>
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
const { hasRole } = useAuth()
const { isCourseEditor, isCourseTeacher } = useAuthLms()
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

// 从 props.chapterData 同步本地状态
// 关键修复：
// 1) 用 toRef 包装 props.chapterData，得到稳定的响应式引用，避免 SSR/hydration 时 getter 失效
// 2) 加 deep:true 确保对象内部属性变化也能被捕获（父组件 cRequest.use 的 onMounted refresh
//    会创建新的 chapter 对象引用，但生产压缩后浅 watch 偶有不触发的情况）
// 3) 去掉 `if (!data) return` 守卫，统一用可选链处理 undefined
// 4) onMounted 强制再同步一次，兜底 SSR/hydration 边界时序差异
const chapterDataRef = toRef(props, 'chapterData')

function syncFromChapterData(data: typeof props.chapterData) {

  isOpen.value = !!data?.isOpen
  selectedClassIds.value = (data?.classChapters || []).filter(c => c.open).map(c => c.classId)
}

watch(chapterDataRef, syncFromChapterData, { immediate: true, deep: true })

onMounted(() => syncFromChapterData(props.chapterData))

// 更新章节 isOpen
async function updateOpen(val: boolean) {
  savingOpen.value = true
  try {
    await cRequest('/api/chapters/update', {
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
    await cRequest('/api/chapters/classes', {
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
