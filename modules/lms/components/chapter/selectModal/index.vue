<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('chapter.select') }}</h3>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="outline" :label="$t('chapter.selectAll')" @click="selectAll" />
            <UButton size="xs" variant="outline" :label="$t('chapter.selectNone')" @click="clearSelection" />
          </div>
        </div>
        <div v-if="!classId" class="py-8 text-center text-muted text-sm">{{ $t('chapter.noClass') }}</div>
        <div v-else-if="loading" class="py-8 text-center text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />{{ $t('common.loading') }}
        </div>
        <div v-else-if="!students.length" class="py-8 text-center text-muted text-sm">{{ $t('classSelector.noUsers') }}</div>
        <template v-else>
          <div class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg flex-wrap">
            <span class="text-sm text-muted whitespace-nowrap">{{ $t('chapter.randomCount') }}</span>
            <UInput v-model.number="randomCount" type="number" min="1" :max="students.length" size="xs" class="w-20" />
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-shuffle"
              :label="randomizing ? $t('common.loading') : $t('chapter.randomPick')"
              :loading="randomizing" @click="randomSelect" />
            <span v-if="selectedIds.length" class="ml-auto text-xs text-muted">
              {{ $t('chapter.selected', { n: selectedIds.length }) }}
            </span>
          </div>
          <div class="max-h-[400px] overflow-y-auto">
            <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
              <AuthUserCard v-for="s in students" :key="s.id" :user="s"
                :selected="selectedIds.includes(s.id)" @click="toggleSelect(s.id)" />
            </div>
          </div>
          <div v-if="selectedIds.length" class="flex items-center justify-between gap-2 pt-4 border-t border-default flex-wrap">
            <div class="flex items-center gap-1">
              <ChapterSelectModalScoreButton v-for="n in [1,2,3,4,5]" :key="n" :delta="n"
                :selected-count="selectedIds.length" :saving="saving"
                @confirm="adjustScore" @cancel="closePopovers" />
            </div>
            <div class="flex items-center gap-1">
              <ChapterSelectModalScoreButton v-for="n in [1,2,3,4,5]" :key="n" :delta="-n"
                :selected-count="selectedIds.length" :saving="saving"
                @confirm="adjustScore" @cancel="closePopovers" />
            </div>
            <div class="flex items-center gap-2">
              <UInput v-model.number="customScore" type="number" size="sm" class="w-24" />
              <UPopover :modal="true">
                <UButton icon="i-lucide-minus" color="error" variant="solid" size="sm" :label="$t('chapter.subScore')" />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ $t('chapter.scoreConfirm', { delta: '-' + Math.abs(Number(customScore) || 0), n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ $t('common.cancel') }}</UButton>
                      <UButton size="xs" color="error" :loading="saving" @click="adjustScore(-Math.abs(Number(customScore) || 0))">{{ $t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
              <UPopover :modal="true">
                <UButton icon="i-lucide-plus" color="success" variant="solid" size="sm" :label="$t('chapter.addScore')" />
                <template #content>
                  <div class="p-3 space-y-2 w-40">
                    <p class="text-sm text-muted">{{ $t('chapter.scoreConfirm', { delta: '+' + Math.abs(Number(customScore) || 0), n: selectedIds.length }) }}</p>
                    <div class="flex justify-end gap-2">
                      <UButton size="xs" variant="ghost" @click="closePopovers">{{ $t('common.cancel') }}</UButton>
                      <UButton size="xs" color="success" :loading="saving" @click="adjustScore(Math.abs(Number(customScore) || 0))">{{ $t('common.save') }}</UButton>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel('open', { default: false })
const props = defineProps({
  courseId: { type: Number, default: 0 },
  classId: { type: Number, default: 0 },
  chapterId: { type: Number, default: 0 },
})
const {
  loading, saving, randomizing, students, selectedIds, randomCount, customScore,
  closePopovers, toggleSelect, selectAll, clearSelection, randomSelect, adjustScore,
} = useChapterSelect(props, isOpen)
</script>
