<template>
  <LayoutHeader v-if="!playFullscreen" />

  <UMain>
    <UContainer>
      <UPage>
        <!-- 左侧边栏：内容导航（桌面端显示） -->
        <template v-if="showSidebar" #left>
          <UPageAside>
            <LayoutAside />
          </UPageAside>
        </template>

        <!-- 中间：主内容区 -->
        <LayoutMain>
          <slot />
        </LayoutMain>

        <!-- 右侧边栏：本页目录（桌面端显示） -->
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter v-if="!playFullscreen" />
</template>

<script setup lang="ts">
const { showSidebar, showToc } = useLayoutState()
const { playFullscreen } = useChapterBtns()
</script>
