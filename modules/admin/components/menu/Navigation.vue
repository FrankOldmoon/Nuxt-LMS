<template>
  <div>
    <!-- Top: overview link + edit menu entry -->
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

    <!-- Desktop vertical menu -->
    <div class="hidden lg:block">
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :highlight="true"
        color="primary"
        class="w-full"
      />
    </div>

    <!-- Mobile trigger button -->
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

    <!-- Mobile floating drawer -->
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

    <!-- Menu editor -->
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

// Menu items (tree): visibleItems → UNavigationMenu items (supports children nesting)
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

// Close mobile drawer on route change (mimics lms/main.vue)
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)
// Menu data is fetched by useAdminMenu's internal useFetch during SSR and serialized into payload, no need for onMounted secondary loading.
</script>
