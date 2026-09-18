<template>
  <LayoutHeader v-if="!playFullscreen" />

  <UMain>
    <UContainer>
      <UPage>
        <!-- 左侧边栏：内容导航（仅章节页显示） -->
        <template v-if="showSidebar" #left>
          <UPageAside style="padding-top: 0px">
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

  <!-- 登录后全站显示的 Dify 悬浮聊天机器人（全屏播放时隐藏）
       Lazy：见 base/components/layout/index.vue 说明 -->
  <LazyLayoutDifyChat v-if="!playFullscreen" />
</template>

<script setup lang="ts">
const { showSidebar } = useLayoutState()
const { playFullscreen } = useChapterBtns()
</script>
