<template>
  <div>
    <!-- 顶部：概览链接 + 编辑菜单入口 -->
    <div class="flex items-center justify-between mb-2">
      <NuxtLink
        to="/dashboard"
        class="text-sm font-medium text-highlighted hover:text-primary transition-colors flex items-center gap-1"
      >
        <UIcon name="i-lucide-layout-dashboard" />
        <span>{{ t('admin.menu.overview') }}</span>
      </NuxtLink>
      <UButton
        icon="i-lucide-settings"
        variant="ghost"
        size="xs"
        :label="t('admin.menu.edit')"
        @click="editorOpen = true"
      />
    </div>

    <!-- 桌面竖直菜单 -->
    <div class="hidden lg:block">
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :highlight="true"
        color="primary"
        class="w-full"
      />
    </div>

    <!-- 移动端触发按钮 -->
    <div class="lg:hidden">
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="outline"
        size="sm"
        class="w-full justify-center"
        :label="t('admin.menu.tables')"
        @click="drawerOpen = true"
      />
    </div>

    <!-- 移动端浮动抽屉 -->
    <USlideover v-model:open="drawerOpen" side="left" :title="t('admin.menu.tables')">
      <template #body>
        <UNavigationMenu
          :items="navItems"
          orientation="vertical"
          :highlight="true"
          color="primary"
          class="w-full"
        />
      </template>
    </USlideover>

    <!-- 菜单编辑器 -->
    <MenuEditor v-model:open="editorOpen" />
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from '../../utils/types'

const { t } = useI18n()
const { visibleItems } = useAdminMenu()
const route = useRoute()
const drawerOpen = ref(false)
const editorOpen = ref(false)

// 菜单项（树形）：visibleItems → UNavigationMenu items（支持 children 嵌套）
function toNav(list: MenuItem[]): any[] {
  return list.map((it) => {
    if (it.children?.length) {
      return {
        label: it.label,
        icon: it.icon || 'i-lucide-folder',
        children: toNav(it.children),
      }
    }
    return {
      label: it.label,
      to: it.to || (it.table ? `/dashboard/t/${it.table}` : undefined),
      icon: it.icon || 'i-lucide-table',
    }
  })
}

const navItems = computed(() => toNav(visibleItems.value))

// 路由变化关闭移动抽屉（仿 lms/main.vue）
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)
// 菜单数据由 useAdminMenu 内部 useFetch 在 SSR 期拉取并序列化 payload，无需 onMounted 二次加载。
</script>
