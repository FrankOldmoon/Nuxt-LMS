<template>
  <div>
    <!-- 播放/退出播放按钮 + PPT 导出按钮 -->
    <!-- chapterBtnsConfig.showPlay 关闭 OR chapterPage.enableFullscreen 关闭时仅显示 PPT 按钮 -->
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

    <!-- lms 专有：章节按钮、班级卡片、学习进度 -->
    <!-- Lazy：ChapterBtns 内部 6 个弹窗（成绩/点名/计时/弹幕/投票/抢答）里有 ueditorRender，
         静态引用会把节点渲染器与富文本内核拖进「布局 chunk」→ 阻塞首屏 -->
    <LazyChapterBtns />
    <LazyClassUserCard />

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
    <!-- 页面内容编辑器（管理员或课程编辑者可见） -->
    <div v-if="canEditContent" class="flex flex-col gap-3 pt-4 mt-4 border-t border-default">
      <UModal v-model:open="editModalOpen" fullscreen>
        <UButton icon="i-lucide-edit" color="primary" size="sm" :label="$t('layout.editPage')" class="justify-start" />

        <template #body>
          <div class="p-4 h-full">
            <!-- Lazy：完整富文本编辑器（tiptap/ProseMirror + 全部节点扩展 + monaco 等）
                 只有点开「编辑页面」才需要。此前这里是静态引用，本组件又在布局树里常驻，
                 导致整个编辑器栈被打成 4 MB 公共 chunk 并 modulepreload 阻塞首屏。 -->
            <LazyUeditor v-model="chapterContent" :save-handler="handleSave" :lock-id="lockId" ref="ueditorRef"
              :show-insert="true" />
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
      <!-- Lazy：历史记录弹窗内部用 ueditorRender 预览内容 -->
      <LazyChapterHistoryModal :table="'chapters'" :id="chapterId" />
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
  lockId, ueditorRef, saving, handleSaveClick, chapterId,
} = useToc()
</script>
