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
        <LayoutMain>
          <slot />
        </LayoutMain>

        <!-- 右侧边栏：本页目录（桌面端显示） -->
        <template v-if="showToc" #right>
          <LayoutToc/>
        </template>
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter />
</template>

<script setup lang="ts">
useCourseDetail()
useChapterPageData()
const { showSidebar, showToc, tocLinks } = useLayoutState()




// 在 layout 层预取课程/章节数据 + 设置 TOC，确保 SSR 时 toc 组件有数据
// 页面组件中同样调用时，Nuxt useFetch 按 URL 自动去重，不会重复请求

</script>
