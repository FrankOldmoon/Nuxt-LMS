<template>
  <LayoutHeader />

  <UMain>
    <UContainer>
      <UPage>
        <!-- 左侧边栏：内容导航（桌面端显示） -->
        <template v-if="showSidebar" #left>
          <LayoutAside />
        </template>

        <!-- 中间：主内容区 -->
        <LayoutMain :toc-links="tocLinks">
          <slot />
        </LayoutMain>

        <!-- 右侧边栏：本页目录（桌面端显示） -->
        <template v-if="showToc" #right>
          <LayoutToc :links="tocLinks" />
        </template>
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter />
</template>

<script setup lang="ts">
const { tocLinks, showSidebar, showToc } = useLayoutState()
</script>
