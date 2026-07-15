<template>
  <div>
    <!-- Play/QuitPlayButton + PPT Export Button -->
    <!-- chapterBtnsConfig.showPlay Close OR chapterPage.enableFullscreen Closeonly whenShow PPT Button -->
    <div class="mb-3 flex gap-2">
      <UButton v-if="chapterBtnsConfig.showPlay && chapterPageCfg.enableFullscreen"
        :label="playFullscreen ? $t('chapter.exitPlay') : $t('chapter.play')"
        :icon="playFullscreen ? 'i-lucide-minimize' : 'i-lucide-play'" :color="playFullscreen ? 'error' : 'primary'"
        variant="soft" size="sm" class="flex-1 justify-center" @click="togglePlay" />
      <UDropdownMenu :items="downloadItems">
        <UButton :label="$t('chapter.download')" icon="i-lucide-download"
          :loading="downloading" variant="soft" color="warning" size="sm"
          :class="chapterBtnsConfig.showPlay && chapterPageCfg.enableFullscreen ? '' : 'w-full justify-center'" />
      </UDropdownMenu>
    </div>

    <!-- lms specificHas：ChapterButton、Classcard、Learning Progress -->

    <ChapterBtns />
    <ClassUserCard />

    <!-- ChapterLearning Progress（heading summary）- onlyLogin UserShow -->
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

    <!-- Fullscreen playbackmode：TitleUpDownNavigationButton -->
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
    <!-- Page ContentEditeditor（AdminorCourse EditorerVisible） -->
    <div v-if="canEditContent" class="flex flex-col gap-3 pt-4 mt-4 border-t border-default">
      <UModal v-model:open="editModalOpen" fullscreen scrollable>
        <UButton icon="i-lucide-edit" color="primary" size="sm" :label="$t('layout.editPage')" class="justify-start" />

        <template #body>
          <div class="p-4 min-w-[480px]">
            <ueditor v-model="chapterContent" :save-handler="handle save" :lock-id="lockId" ref="ueditorRef" :show-insert="true" />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton :label="$t('common.save')" color="primary" variant="solid" size="sm" :loading="saving"
              @click="handle saveClick" />
          </div>
        </template>
      </UModal>

      <!-- historyRecords -->
      <ChapterHistoryModal :table="'chapters'" :id="chapterId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToc } from './useToc'

const {
  chapterBtnsConfig, chapterPageCfg, playFullscreen, togglePlay,
  downloading, downloadItems, isLoggedIn, chapterTask,
  totalHeadings, allDone, doneHeadings, progressPercent,
  tocLinks, flatHeadings, currentHeadingIndex, goToHeading,
  canEditContent, editModalOpen, chapterContent, handleSave,
  lockId, ueditorRef, saving, handle saveClick, chapterId,
} = useToc()
</script>
