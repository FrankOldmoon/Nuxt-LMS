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

    <USeparator orientation="vertical" class="h-6" />

    <!-- 章节×班级开放矩阵（仅管理员） -->
    <UButton
      v-if="isAdmin"
      icon="i-lucide-grid-3x3"
      color="primary"
      variant="soft"
      size="sm"
      :label="$t('chapter.classOpenMatrix')"
      @click="matrixOpen = true"
    />
  </div>

  <!-- 章节×班级开放矩阵弹窗 -->
  <ChapterClassOpenMatrixModal v-model:open="matrixOpen" :course-id="props.courseId" />
</template>

<script setup lang="ts">
import type { ChapterAccessProps } from '../../composables/useChapterAccess'

const props = defineProps<ChapterAccessProps>()

const {
  canEdit,
  isOpen,
  savingOpen,
  selectedClassIds,
  classOptions,
  updateOpen,
  updateClassOpen,
} = useChapterAccess(props)

const { hasRole } = useAuth()
const isAdmin = hasRole('admin')
const matrixOpen = ref(false)
</script>
