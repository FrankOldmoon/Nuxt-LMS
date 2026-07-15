<template>
  <!-- import base's main, inject doc's sidebar/toc/fullscreen playback via #default slot -->
  <BaseMain>
    <template #default>
      <!-- mobile Toolbar: menu + toc Buttons on the same line -->
      <div v-if="showSidebar" class="lg:hidden flex items-center justify-between gap-2 mb-4">
        <UButton icon="i-lucide-panel-left" color="neutral" variant="outline"
          :label="$t('layout.menu')" @click="asideOpen = true" />
        <UButton icon="i-lucide-panel-right" color="neutral" variant="outline"
          :label="$t('layout.toc')" @click="mobileTocOpen = true" />
      </div>

      <!-- Page Content -->
      <div :class="{ 'chapter-play-mode': playFullscreen }">
        <slot />
      </div>

      <!-- mobile Left Navigation Modal -->
      <USlideover v-if="showSidebar" v-model:open="asideOpen" :title="$t('layout.navigation')" side="left">
        <template #body>
          <LayoutAside />
        </template>
      </USlideover>

      <!-- Mobile right TOC modal -->
      <USlideover v-if="showSidebar" v-model:open="mobileTocOpen" :title="$t('layout.pageToc')" side="right">
        <template #body>
          <LayoutToc />
        </template>
      </USlideover>
    </template>
  </BaseMain>

  <!--
    Class Danmaku overlay (client-only):
    - listen to WebSocket { type: 'danmaku' } messages, render floating danmaku
    - triggered by question/homework/quiz/comment etc. submit-back server broadcast
    - position: fixed overlays the fullscreen, no shadow/affect on layout flow
  -->
  <ClientOnly>
    <ChapterDanmaku />
  </ClientOnly>
</template>

<script setup lang="ts">
import BaseMain from '../../../base/components/layout/main.vue'

const { showSidebar, mobileTocOpen } = useLayoutState()
const { playFullscreen } = useChapterBtns()
const asideOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => {
  asideOpen.value = false
  mobileTocOpen.value = false
})
</script>

<style>
/* Fullscreen playback mode: enlarge font + increase title spacing (h1 chapter title does not participate in spacing shift) */
.chapter-play-mode h2,
.chapter-play-mode h3 {
  margin-top: 1000px !important;
}

.chapter-play-mode {
  font-size: 1.3rem;
  line-height: 1.9;
}

.chapter-play-mode p,
.chapter-play-mode li {
  font-size: 1.3rem;
  line-height: 1.9;
}

.chapter-play-mode h1 {
  font-size: 2.5rem;
}

.chapter-play-mode h2 {
  font-size: 2rem;
}

.chapter-play-mode h3 {
  font-size: 1.7rem;
}
</style>
