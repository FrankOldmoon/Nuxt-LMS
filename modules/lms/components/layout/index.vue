<template>
  <LayoutHeader v-if="!playFullscreen" />

  <UMain>
    <UContainer>
      <UPage>
        <!-- Left sidebar: content navigation (only shown on chapter pages) -->
        <template v-if="showSidebar" #left>
          <UPageAside style="padding-top: 0px">
            <LayoutAside />
          </UPageAside>
        </template>

        <!-- Middle: main content area -->
        <LayoutMain>
          <slot />
        </LayoutMain>
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter v-if="!playFullscreen" />
</template>

<script setup lang="ts">
const { showSidebar } = useLayoutState()
const { playFullscreen } = useChapterBtns()
</script>
