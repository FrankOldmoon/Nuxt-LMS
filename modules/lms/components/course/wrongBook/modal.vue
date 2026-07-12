<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-4xl' }">
    <template #content>
      <div class="flex flex-col" style="height: 80vh;">
        <!-- 固定头部 -->
        <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-book-x" class="text-red-500" />
              {{ $t('chapter.wrongBook') }}
            </h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isOpen = false" />
          </div>

          <!-- 搜索 + 题型筛选 -->
          <div class="flex items-center gap-2">
            <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-36" />
            <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
              icon="i-lucide-search" size="sm" class="flex-1" @keydown.enter="refetch" />
            <UButton size="sm" color="primary" variant="soft" icon="i-lucide-refresh-cw" @click="refetch">
              {{ $t('common.refresh') }}
            </UButton>
          </div>
        </div>

        <!-- 滚动列表区 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
            <span class="text-sm">{{ $t('common.loading') }}</span>
          </div>

          <div v-else-if="!items.length" class="flex items-center justify-center h-full text-gray-400 text-sm">
            <UIcon name="i-lucide-check-circle-2" class="size-8 mr-2 text-green-400" />
            {{ $t('chapter.wrongBookEmpty') }}
          </div>

          <div v-else class="space-y-3">
            <CourseWrongBookItem v-for="item in items" :key="`${item.courseId}-${item.cid}`" :item="item" />
          </div>
        </div>

        <!-- 固定底部：分页 -->
        <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">
                {{ total === 0 ? '0 / 0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} / ${total}` }}
              </span>
              <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-16" />
            </div>
            <div class="flex items-center gap-1">
              <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost"
                :disabled="page <= 1" @click="prevPage" />
              <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
              <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost"
                :disabled="page >= totalPages" @click="nextPage" />
            </div>
          </div>
          <div class="flex justify-end">
            <UButton variant="ghost" size="sm" @click="isOpen = false">{{ $t('common.close') }}</UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  courseId: { type: Number, default: 0 },
})
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const {
  items, total, page, pageSize, loading, keyword, filterType,
  pageSizeOptions, typeOptions, totalPages, prevPage, nextPage, refetch,
} = useWrongBook(props, emit)
</script>
