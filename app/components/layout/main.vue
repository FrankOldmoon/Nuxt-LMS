<template>
  <UPageBody>
    <!-- 移动端工具栏：左按钮弹开 aside，右按钮弹开 toc -->
    <div
      v-if="showSidebar || tocLinks?.length"
      class="lg:hidden flex items-center justify-between gap-2 mb-4"
    >
      <UButton
        v-if="showSidebar"
        icon="i-lucide-panel-left"
        color="neutral"
        variant="outline"
        :label="$t('layout.menu')"
        @click="asideOpen = true"
      />
      <UButton
        v-if="showToc && tocLinks?.length"
        icon="i-lucide-panel-right"
        color="neutral"
        variant="outline"
        :label="$t('layout.toc')"
        @click="tocOpen = true"
      />
    </div>

    <!-- 页面内容 -->
    <slot />

    <!-- 移动端左侧导航弹窗 -->
    <USlideover v-if="showSidebar" v-model:open="asideOpen" :title="$t('layout.navigation')" side="left">
      <template #body>
        <UNavigationMenu
          :items="sidebarNav"
          orientation="vertical"
          :highlight="true"
          color="primary"
          class="w-full"
        />
      </template>
    </USlideover>

    <!-- 移动端目录弹窗 -->
    <USlideover v-if="showToc && tocLinks?.length" v-model:open="tocOpen" :title="$t('layout.pageToc')" side="right">
      <template #body>
        <LayoutTocList :links="tocLinks" :title="$t('layout.pageToc')" />
      </template>
    </USlideover>
  </UPageBody>
</template>

<script setup lang="ts">
defineProps<{
  tocLinks?: { id: string; text: string; children?: any[] }[]
}>()

const { showSidebar, showToc, tocLinks } = useLayoutState()
const { navigation: sidebarNav } = useSidebarNav()
const asideOpen = ref(false)
const tocOpen = ref(false)

// 路由变化时自动关闭弹窗
const route = useRoute()
watch(() => route.fullPath, () => {
  asideOpen.value = false
  tocOpen.value = false
})
</script>
