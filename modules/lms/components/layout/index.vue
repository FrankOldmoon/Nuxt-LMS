<template>
  <LayoutHeader v-if="!playFullscreen" />

  <UMain>
    <UContainer>
      <UPage>
        <!-- 左侧边栏：内容导航（仅章节页显示） -->
        <template v-if="showSidebar" #left>
          <UPageAside>
            <LayoutAside />
          </UPageAside>
        </template>

        <!-- 中间：主内容区 -->
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
