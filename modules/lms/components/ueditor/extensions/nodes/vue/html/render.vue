<template>
  <div ref="contentBox" class="relative border border-gray-200 rounded-md bg-white overflow-hidden">
    <!-- Top-right fullscreen button -->
    <UButton @click="toggleFullscreen" color="primary"
      class="absolute top-2 right-2 text-xs px-2.5 py-1 transition-colors cursor-pointer z-10">
      {{ $t('common.fullscreen') }}
    </UButton>

    <!--
      iframe completely isolates user HTML: external CSS does not affect content, and content CSS does not leak out.
      sandbox="allow-scripts" allows scripts to run and interact, but does not allow access to the parent page.
    -->
    <iframe :srcdoc="iframeContent" sandbox="allow-scripts" class="w-full"
      :style="{ height: isFullscreen ? '100vh' : iframeHeight + 'px', border: 0 }" />
  </div>
</template>

<script setup>
import { useHtmlRender } from './useHtmlRender'

const props = defineProps({
  node: Object,
})

const { contentBox, iframeHeight, isFullscreen, iframeContent, toggleFullscreen } = useHtmlRender(props)
</script>

<style scoped>

  /* When fullscreen, container fills the screen */
  div:fullscreen {
    background: #fff;
    width: 100vw;
    height: 100vh;
    overflow: auto;
  }
</style>
